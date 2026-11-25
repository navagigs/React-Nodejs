const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const bodyParser = require('body-parser');
const multer = require('multer'); // <-- 1. Import Multer
const path = require('path');
const fs = require('fs'); // Untuk menghapus file
const util = require('util');
const fsp = fs.promises;

const app = express();
const PORT = 5001; // KITA KUNCI DI PORT 5001
const JWT_SECRET = 'rahasia_kita_123';

app.use(cors());
app.use(express.json());
// Agar bisa membaca data form-data yang rumit
app.use(bodyParser.urlencoded({ extended: true })); 

// --- 2. KONFIGURASI MULTER (Tempat Simpan & Nama File) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Simpan di folder 'uploads'
    },
    filename: (req, file, cb) => {
        // Buat nama file unik: timestamp + ekstensi asli
        // Contoh: 1634567890123.jpg
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- 3. BUKA AKSES FOLDER UPLOADS KE PUBLIK ---
// Ini penting agar frontend bisa akses gambar via URL: http://localhost:5000/uploads/namafile.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- KONFIGURASI DATABASE ---
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',       // Sesuaikan jika ada password
    database: 'admin_react' // Pastikan nama DB benar
};
const db = mysql.createConnection(dbConfig);
const dbQuery = util.promisify(db.query).bind(db);
const backupsDir = path.join(__dirname, 'backups');

const ensureBackupsTable = async () => {
    await dbQuery(`CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255),
        original_name VARCHAR(255),
        size INT DEFAULT 0,
        tables_count INT DEFAULT 0,
        note VARCHAR(255) DEFAULT NULL,
        created_by VARCHAR(150) DEFAULT NULL,
        created_at DATETIME
    )`);
};

const ensureActivityLogsTable = async () => {
    await dbQuery(`CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(150) NOT NULL DEFAULT 'Unknown',
        role_id INT NULL,
        action VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NULL,
        created_at DATETIME NOT NULL
    )`);
};

const ensureQrTables = async () => {
    await dbQuery(`CREATE TABLE IF NOT EXISTS qr_codes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        qr_text TEXT NOT NULL,
        image VARCHAR(255) DEFAULT NULL,
        size INT NOT NULL DEFAULT 320,
        level VARCHAR(1) NOT NULL DEFAULT 'M',
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
    await dbQuery(`CREATE TABLE IF NOT EXISTS qr_code_histories (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        qr_code_id INT NOT NULL,
        action VARCHAR(20) NOT NULL,
        title VARCHAR(150) NOT NULL,
        qr_text TEXT NOT NULL,
        image VARCHAR(255) DEFAULT NULL,
        size INT NOT NULL,
        level VARCHAR(1) NOT NULL,
        changed_by INT DEFAULT NULL,
        changed_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
};

const sanitizeTableName = (name) => `\`${String(name).replace(/`/g, '``')}\``;

const escapeSqlValue = (value) => {
    if (value === null || value === undefined) return 'NULL';
    if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        const formatted = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
        return `'${formatted}'`;
    }
    if (typeof value === 'object') {
        value = JSON.stringify(value);
    }
    const str = String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\0/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z');
    return `'${str}'`;
};

const formatBackupDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString();
};

const createDatabaseDump = async () => {
    const tableRows = await dbQuery('SHOW TABLES');
    const tableKey = tableRows.length ? Object.keys(tableRows[0])[0] : null;
    const tableNames = (tableKey ? tableRows.map((row) => row[tableKey]) : []).filter((name) => name !== 'backups' && name !== 'activity_logs');
    let sql = '';
    sql += `-- Admin React MySQL Backup\n`;
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += `-- Database: ${dbConfig.database}\n\n`;
    sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    for (const tableName of tableNames) {
        const safeTable = sanitizeTableName(tableName);
        const createRows = await dbQuery(`SHOW CREATE TABLE ${safeTable}`);
        const createSql = createRows[0] && (createRows[0]['Create Table'] || createRows[0]['Create View']);
        if (!createSql) continue;
        sql += `DROP TABLE IF EXISTS ${safeTable};\n`;
        sql += `${createSql};\n\n`;
        const rows = await dbQuery(`SELECT * FROM ${safeTable}`);
        if (rows.length) {
            const columns = Object.keys(rows[0]).map(sanitizeTableName).join(', ');
            for (const row of rows) {
                const values = Object.keys(row).map((col) => escapeSqlValue(row[col])).join(', ');
                sql += `INSERT INTO ${safeTable} (${columns}) VALUES (${values});\n`;
            }
            sql += '\n';
        }
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    return { sql, tablesCount: tableNames.length };
};

const MARKETING_MENUS = [
    [200, 1, 'Marketing Center', 'marketing-center', 'Modul marketing, campaign, dan analytics', 190, 'Megaphone'],
    [201, 200, 'Dashboard Marketing', 'marketing-center/dashboard', 'Ringkasan performa marketing', 191, 'LayoutDashboard'],
    [202, 200, 'Kontak & Database', 'marketing-center/contacts', 'Kelola kontak dan database prospek', 192, 'Users'],
    [203, 200, 'Grup & Segmentasi', 'marketing-center/groups', 'Kelola grup dan segmentasi kontak', 193, 'UsersRound'],
    [204, 200, 'Email Marketing', 'marketing-center/email', 'Kelola kampanye email marketing', 194, 'Mail'],
    [205, 200, 'WhatsApp Marketing', 'marketing-center/whatsapp', 'Kelola kampanye WhatsApp marketing', 195, 'MessageCircle'],
    [206, 200, 'Campaign Management', 'marketing-center/campaigns', 'Kelola seluruh kampanye marketing', 196, 'Megaphone'],
    [207, 200, 'Template Pesan', 'marketing-center/templates', 'Kelola template email dan WhatsApp', 197, 'FileText'],
    [208, 200, 'Analytics & Reports', 'marketing-center/analytics', 'Laporan dan analisis performa', 198, 'BarChart3'],
    [209, 200, 'Integrasi & Pengaturan', 'marketing-center/settings', 'Pengaturan integrasi layanan marketing', 199, 'Settings']
];

const ensureMarketingMenu = async () => {
    const insertMenu = `INSERT INTO menu (menu_id, parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
        VALUES (?, ?, ?, ?, ?, ?, 'menu', 1, 1, 1, 1, 1, 1, 1, 1, '', ?)
        ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), title = VALUES(title), url = VALUES(url), description = VALUES(description), menu_order = VALUES(menu_order), type = 'menu', is_view = 1, is_create = 1, is_edit = 1, is_delete = 1, is_export = 1, is_duplicate = 1, is_unlock = 1, is_active = 1, class_active = '', icon = VALUES(icon)`;
    for (const menu of MARKETING_MENUS) {
        await dbQuery(insertMenu, menu);
    }
    await dbQuery(`INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
        SELECT r.role_id, m.menu_id,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END
        FROM roles r
        INNER JOIN menu m ON m.menu_id BETWEEN 200 AND 209`);
};

// Cek Koneksi Database
db.connect((err) => {
    if (err) {
        console.error("❌ Database Error:", err.message);
    } else {
        console.log("✅ Database Terhubung!");
        db.query(`CREATE TABLE IF NOT EXISTS app_settings (
            id INT NOT NULL PRIMARY KEY,
            site_title VARCHAR(150) NOT NULL DEFAULT 'Admin Panel',
            site_description VARCHAR(500) NOT NULL DEFAULT '',
            logo VARCHAR(255) DEFAULT NULL,
            meta_title VARCHAR(255) DEFAULT NULL,
            meta_description VARCHAR(500) DEFAULT NULL,
            meta_keywords VARCHAR(500) DEFAULT NULL,
            updated_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
        db.query(`INSERT IGNORE INTO app_settings (id, site_title, site_description, logo, meta_title, meta_description, meta_keywords)
            VALUES (1, 'Admin Panel', 'StrikingDash React Web Application', '', 'Admin Panel', 'StrikingDash React Web Application', 'admin, dashboard, react')`);
        db.query(`INSERT INTO menu (parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
            SELECT 1, 'QR Code', 'qr-code', 'Generate QR code dengan logo opsional', 160, 'menu', 1, 0, 0, 0, 0, 0, 0, 1, '', 'QrCode'
            FROM (SELECT 1) AS t
            WHERE NOT EXISTS (SELECT 1 FROM menu WHERE url = 'qr-code')`);
        db.query(`INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
            SELECT r.role_id, m.menu_id, 1, 0, 0, 0, 0, 0, 0
            FROM roles r
            INNER JOIN menu m ON m.url = 'qr-code'`);
        ensureMarketingMenu().catch((marketingErr) => {
            console.error("❌ Marketing Menu Error:", marketingErr.message);
        });
        ensureBackupsTable().catch((tableErr) => {
            console.error("❌ Backups Table Error:", tableErr.message);
        });
        ensureActivityLogsTable().catch((tableErr) => {
            console.error("❌ Activity Logs Table Error:", tableErr.message);
        });
        ensureQrTables().catch((tableErr) => {
            console.error("❌ QR Tables Error:", tableErr.message);
        });
    }
});
 
// --- API LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Login Request dari: ${email}`); // Cek terminal saat klik login

    // Validasi input awal
    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Login Database Error:", err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server', details: err.message });
        }
        
        // 1. Cek apakah email terdaftar
        if (results.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah' }); 
        }

        const user = results[0];

        try {
            // 2. Cek password input dengan hash di DB
            const isMatch = await bcrypt.compare(password, user.password);

            // 3. Jika password tidak cocok
            if (!isMatch) {
                return res.status(401).json({ message: 'Email atau password salah' });
            }

            if (!user.is_active) {
                return res.status(403).json({ message: 'Akun tidak aktif' });
            }

            // =========================================================================
            // FIX: Tarik data Hak Akses (Permissions) dari tabel module_authority
            // Kita hanya mengambil menu yang status 'is_view'-nya aktif (1)
            // =========================================================================
            const sqlAuth = `
                SELECT menu_id,  is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock 
                FROM module_authority 
                WHERE role_id = ? AND is_view = 1
            `;

            db.query(sqlAuth, [user.role_id], (errAuth, permissions) => {
                if (errAuth) {
                    console.error("Fetch Permissions Error:", errAuth);
                    return res.status(500).json({ message: 'Gagal mengambil data hak akses', details: errAuth.message });
                }

                // 4. Jika sukses ambil hak akses, buat token JWT
                // Menyertakan role_id ke dalam token payload jika dibutuhkan untuk middleware backend
                const token = jwt.sign(
                    { id: user.id, email: user.email, role_id: user.role_id }, 
                    JWT_SECRET, 
                    { expiresIn: '1d' }
                );

                // 5. Kirim respons balik lengkap ke frontend termasuk role_id dan permissions
                res.json({ 
                    message: "Login berhasil!",
                    token, 
                    role_id: user.role_id, // Dikirim terpisah agar mudah dibaca frontend
                    permissions,           // Berisi array list hak akses yang bernilai string 1
                    user: { 
                        id: user.id,
                        name: user.name, 
                        email: user.email,
                        role_id: user.role_id
                    } 
                });
            });

        } catch (bcryptErr) {
            console.error("Bcrypt Compare Error:", bcryptErr);
            return res.status(500).json({ message: 'Gagal memproses verifikasi keamanan' });
        }
     });
});

// --- API FACE LOGIN ---
app.post('/api/face-login', (req, res) => {
    const { descriptor } = req.body;
    if (!Array.isArray(descriptor) || descriptor.length < 64) {
        return res.status(400).json({ message: 'Data wajah tidak valid' });
    }

    db.query('SELECT * FROM users WHERE face_descriptor IS NOT NULL AND face_descriptor <> ""', (err, users) => {
        if (err) {
            console.error('Face Login Database Error:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server', details: err.message });
        }

        let bestUser = null;
        let bestDistance = 0.6;
        for (const candidate of users || []) {
            let stored = null;
            try { stored = JSON.parse(candidate.face_descriptor); } catch (e) { continue; }
            if (!Array.isArray(stored) || stored.length !== descriptor.length) continue;
            let sum = 0;
            for (let i = 0; i < descriptor.length; i++) {
                const diff = Number(descriptor[i]) - Number(stored[i]);
                sum += diff * diff;
            }
            const distance = Math.sqrt(sum);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestUser = candidate;
            }
        }

        if (!bestUser) {
            return res.status(401).json({ message: 'Wajah tidak dikenali' });
        }

        if (!bestUser.is_active) {
            return res.status(403).json({ message: 'Akun tidak aktif' });
        }

        const user = bestUser;
        const sqlAuth = `SELECT menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock FROM module_authority WHERE role_id = ? AND is_view = 1`;
        db.query(sqlAuth, [user.role_id], (errAuth, permissions) => {
            if (errAuth) {
                console.error('Fetch Permissions Error:', errAuth);
                return res.status(500).json({ message: 'Gagal mengambil data hak akses', details: errAuth.message });
            }
            const token = jwt.sign({ id: user.id, email: user.email, role_id: user.role_id }, JWT_SECRET, { expiresIn: '1d' });
            res.json({
                message: 'Login wajah berhasil!',
                token,
                role_id: user.role_id,
                permissions: permissions || [],
                user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id }
            });
        });
    });
});

 app.get('/api/menus/access/:role_id', (req, res) => {
    const roleId = req.params.role_id;

    if (!roleId) {
        return res.status(400).json({ message: "Role ID tidak ditemukan" });
    }

    // Kueri SQL: Hanya mengambil menu yang memiliki izin 'is_view' = 1 untuk role_id ini
    const sql = `
        SELECT m.* FROM menu m
        INNER JOIN module_authority ma ON m.menu_id = ma.menu_id
        WHERE ma.role_id = ? AND ma.is_view = 1 AND m.is_active = 1
        ORDER BY m.menu_order ASC
    `;
    
    db.query(sql, [roleId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // PENGELOMPOKAN DATA TREE VIA LINEAR MAP (Sama dengan Modul Authority)
        const menuMap = {};
        const menuTree = [];

        // Langkah A: Daftarkan semua menu berizin ke dalam Map dan siapkan array 'subs' kosong
        result.forEach(item => {
            menuMap[String(item.menu_id)] = { ...item, subs: [] };
        });

        // Langkah B: Distribusikan child menu ke dalam properti 'subs' induknya
        result.forEach(item => {
            const currentItemInMap = menuMap[String(item.menu_id)];
            const pId = item.parent_id;

            // Kriteria Penentu MENU UTAMA (ROOT LEVEL):
            // Dianggap menu utama jika parent_id kosong, bernilai 0, bernilai 0, bernilai 1, atau bernilai 1
            const isRoot = !pId || pId === 0 || pId === '0' || pId === 1 || pId === 1;

            if (isRoot) {
                // Masuk sebagai Menu Level Utama (Terluar) di Sidebar
                menuTree.push(currentItemInMap);
            } else {
                // Jika merupakan sub-menu, cari induknya di dalam Map
                const parentItem = menuMap[String(pId)];
                if (parentItem) {
                    // Masukkan ke dalam array sub-menu induknya
                    parentItem.subs.push(currentItemInMap);
                } else {
                    // Jalur Cadangan: Jika induknya tidak ter-select (misal is_view induk bernilai '0'),
                    // tetap munculkan di level luar agar menu anak tidak hilang hilang misterius
                    menuTree.push(currentItemInMap);
                }
            }
        });

        // Langkah C: Urutkan menu utama dan seluruh sub-menu secara rekursif berdasarkan menu_order
        const sortTreeRecursive = (nodes) => {
            nodes.sort((a, b) => (Number(a.menu_order) || 0) - (Number(b.menu_order) || 0));
            nodes.forEach(node => {
                if (node.subs && node.subs.length > 0) {
                    sortTreeRecursive(node.subs);
                }
            });
        };
        
        // Jalankan pengurutan urutan menu
        sortTreeRecursive(menuTree);

        // Kembalikan struktur pohon yang sudah rapi dan siap dibaca Sidebar komponen Anda
        return res.json(menuTree);
    });
});

// --- API DASHBOARD (GET DATA) ---
app.get('/api/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

 // 1. GET (Ambil Semua Data) - Tetap sama karena menggunakan SELECT *
 app.get('/api/portfolio', (req, res) => {
    // Menggabungkan tabel portfolio dengan tabel clients berdasarkan ID client
    // Gantilah p.*, c.name AS client_name sesuai dengan nama kolom asli di database Anda
    const sql = `
        SELECT 
            p.*, 
            c.name AS client_name,
            c.address AS client_location
        FROM portfolio p
        LEFT JOIN client c ON p.client_id = c.id
        ORDER BY p.id DESC
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching portfolio with client relation:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        return res.json(result);
    });
});

// 2. POST (Tambah Data Baru + Kolom Baru + GAMBAR)
app.post('/api/portfolio', upload.single('image'), (req, res) => {
    // Destructuring variabel baru dari req.body
    const { 
        title, description, client_id, status,
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date,
        date
    } = req.body;
    
    const imageFilename = req.file ? req.file.filename : null; 

    // Query diupdate sesuai dengan susunan kolom baru di database
    const sql = `INSERT INTO portfolio (
        title, description, client_id, status, date, image, 
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // Pastikan urutan array params ini sama persis dengan urutan kolom di atas!
    const params = [
        title, description, client_id, status || 'Pending', date, imageFilename,
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Success", id: result.insertId });
    });
});

// 3. PUT (Update Data + Kolom Baru + GAMBAR OPTIONAL)
app.put('/api/portfolio/:id', upload.single('image'), (req, res) => {
    const { 
        title, client_id, description, status, date,
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date 
    } = req.body; 
    const id = req.params.id;
    
    let sql = "";
    let params = [];

    // Cek apakah user mengupload gambar BARU? 
    if (req.file) {
        // Update dengan gambar baru + data teks baru
        sql = `UPDATE portfolio SET 
            title=?, client_id=?, description=?, status=?, date=?, image=?, 
            portfolio_value=?, project_name=?, contract_number=?, 
            contract_year=?, contract_start_date=?, contract_end_date=? 
            WHERE id=?`;
        
        params = [
            title, client_id, description, status || 'Pending', date, req.file.filename, 
            portfolio_value, project_name, contract_number, 
            contract_year, contract_start_date, contract_end_date, 
            id
        ];
    } else {
        // Update data teks SAJA (gambar lama tetap aman)
        sql = `UPDATE portfolio SET 
            title=?, client_id=?, description=?, status=?, date=?, 
            portfolio_value=?, project_name=?, contract_number=?, 
            contract_year=?, contract_start_date=?, contract_end_date=? 
            WHERE id=?`;
        
        params = [
            title, client_id, description, status || 'Pending', date, 
            portfolio_value, project_name, contract_number, 
            contract_year, contract_start_date, contract_end_date, 
            id
        ];
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Updated Successfully" });
    });
});

// 4. DELETE (Hapus Data & File Fisik) - Tetap sama karena berbasis ID target
app.delete('/api/portfolio/:id', (req, res) => {
    const id = req.params.id;
    
    db.query("SELECT image FROM portfolio WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        
        const imageToDelete = results[0]?.image;

        db.query("DELETE FROM portfolio WHERE id=?", [id], (err, result) => {
            if (err) return res.status(500).json(err);

            if (imageToDelete) {
                const filePath = path.join(__dirname, 'uploads', imageToDelete);
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error("Gagal menghapus file gambar lama:", unlinkErr);
                });
            }
            return res.json({ message: "Deleted Successfully" });
        });
    });
});


// 1. GET (Ambil Semua Data Client)
app.get('/api/clients', (req, res) => {
    const sql = "SELECT * FROM client ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json(result);
    });
});

// 2. POST (TAMBAH CLIENT BARU)
app.post('/api/clients', upload.single('image'), (req, res) => {
    const { name, address } = req.body;
    const image = req.file ? req.file.filename : null;

    const sql = "INSERT INTO client (name, address, image) VALUES (?, ?, ?)";
    
    db.query(sql, [name, address, image], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database Error" });
        }
        return res.status(201).json({ message: "Client created", id: result.insertId });
    });
});

// 3. PUT (UPDATE CLIENT)
app.put('/api/clients/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { name, address } = req.body;
    let newImage = req.file ? req.file.filename : null;

    // Langkah 1: Jika ada gambar baru, hapus gambar lama dulu (Opsional tapi disarankan)
    if (newImage) {
        const getOldImageSql = "SELECT image FROM client WHERE id = ?";
        db.query(getOldImageSql, [id], (err, results) => {
            if (!err && results.length > 0 && results[0].image) {
                const oldImagePath = path.join(__dirname, 'uploads', results[0].image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Hapus file lama
                }
            }
        });
    }

    // Langkah 2: Query Update
    let sql = "UPDATE client SET name=?, address=? WHERE id=?";
    let params = [name, address, id];

    // Jika user upload gambar baru, update kolom image juga
    if (newImage) {
        sql = "UPDATE client SET name=?, address=?, image=? WHERE id=?";
        params = [name, address, newImage, id];
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Client updated" });
    });
});

// 4. DELETE (HAPUS CLIENT)
app.delete('/api/clients/:id', (req, res) => {
    const id = req.params.id;

    // Langkah 1: Ambil nama file gambar sebelum menghapus data di DB
    const getSql = "SELECT image FROM client WHERE id = ?";
    
    db.query(getSql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: "Client not found" });

        const imageFile = results[0].image;

        // Langkah 2: Hapus data dari Database
        const deleteSql = "DELETE FROM client WHERE id = ?";
        db.query(deleteSql, [id], (err, result) => {
            if (err) return res.status(500).json(err);

            // Langkah 3: Jika berhasil hapus DB, hapus file gambar dari folder 'uploads'
            if (imageFile) {
                const filePath = path.join(__dirname, 'uploads', imageFile);
                fs.unlink(filePath, (err) => {
                    if (err) console.error("Gagal menghapus file gambar:", err);
                });
            }

            return res.json({ message: "Client deleted successfully" });
        });
    });
});

// ==========================================
// API KATEGORI BERITA
// ==========================================

// GET Categories
app.get('/api/categories', (req, res) => {
    db.query("SELECT * FROM categories ORDER BY name ASC", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// POST Category
app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    db.query("INSERT INTO categories (name) VALUES (?)", [name], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Category added", id: result.insertId });
    });
});

// PUT Category
app.put('/api/categories/:id', (req, res) => {
    const { name } = req.body;
    db.query("UPDATE categories SET name=? WHERE id=?", [name, req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Category updated" });
    });
});

// DELETE Category
app.delete('/api/categories/:id', (req, res) => {
    db.query("DELETE FROM categories WHERE id=?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Category deleted" });
    });
});

// ==========================================
// API  (article)
// ==========================================

// GET article (Join dengan Category)
app.get('/api/articles', (req, res) => {
    const sql = `
        SELECT articles.*, categories.name as category_name 
        FROM articles
        LEFT JOIN categories ON articles.category_id = categories.id 
        ORDER BY articles.created_at DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
}); 

// --- GET ALL ARTICLES ---
app.get('/api/articles', (req, res) => {
    const sql = `
        SELECT articles.*, categories.name AS category_name 
        FROM articles 
        LEFT JOIN categories ON articles.category_id = categories.id 
        ORDER BY articles.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- CREATE ARTICLE ---
app.post('/api/articles', upload.single('image'), (req, res) => {
    const { title, content, category_id, status } = req.body;
    const articleStatus = status || 'published';
    const image = req.file ? req.file.filename : null;
    
    const sql = "INSERT INTO articles (title, content, category_id, image, status) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, content, category_id, image, articleStatus], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Article created successfully", id: result.insertId });
    });
});

// --- UPDATE ARTICLE (Supports PUT / POST Spoofing) ---
app.post('/api/articles/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { title, content, category_id, status } = req.body;
    const newImage = req.file ? req.file.filename : null;

    db.query("SELECT image, status FROM articles WHERE id=?", [id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0) return res.status(404).json({ message: 'Article not found' });

        const oldImage = rows[0].image;
        const articleStatus = status || rows[0].status || 'published';

        let sql, params;
        if (newImage) {
            sql = "UPDATE articles SET title=?, content=?, category_id=?, image=?, status=? WHERE id=?";
            params = [title, content, category_id, newImage, articleStatus, id];
        } else {
            sql = "UPDATE articles SET title=?, content=?, category_id=?, status=? WHERE id=?";
            params = [title, content, category_id, articleStatus, id];
        }

        db.query(sql, params, (err) => {
            if (err) return res.status(500).json(err);

            // Hapus gambar lama dari server jika ada gambar baru yang diunggah
            if (newImage && oldImage) {
                const oldPath = path.join(__dirname, 'uploads', oldImage);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (err) => {
                        if (err) console.error("Gagal menghapus gambar lama:", err);
                    });
                }
            }

            res.json({ message: 'Article updated successfully' });
        });
    });
});

// --- DELETE ARTICLE ---
app.delete('/api/articles/:id', (req, res) => {
    const id = req.params.id;
    db.query("SELECT image FROM articles WHERE id=?", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        
        db.query("DELETE FROM articles WHERE id=?", [id], (err) => {
            if (err) return res.status(500).json(err);
            
            // Hapus file fisik gambar secara non-blocking
            if (results.length > 0 && results[0].image) {
                const filePath = path.join(__dirname, 'uploads', results[0].image);
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Gagal menghapus file:", err);
                    });
                }
            }
            res.json({ message: "Article deleted successfully" });
        });
    });
});
// ==========================================
//          API LOGIC FOR LETTERS (FIXED)
// ==========================================

// 5. GET: Hitung total surat untuk keperluan No urut otomatis
app.get('/api/letters/next-number', (req, res) => {
    const sql = "SELECT COUNT(*) AS total FROM letters";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        
        const nextCount = (result[0]?.total || 0) + 1;
        return res.json({ nextCount });
    });
});

// 1. GET (Ambil Semua Data Surat - Diurutkan dari yang terbaru) 
app.get('/api/letters', (req, res) => {
    const sql = `
        SELECT letters.*, client.name AS client_name 
        FROM letters 
        LEFT JOIN client ON letters.client_id = client.id 
        ORDER BY letters.id DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json(result);
    });
});

// 2. POST (Tambah Surat Baru - Attachment berupa Note/Teks Biasa)
// PERBAIKAN: Menghapus 'upload.single('attachment')' karena data dikirim via JSON
app.post('/api/letters', (req, res) => {
    const { 
        client_id, 
        letter_number, 
        letter_type, 
        subject,
        letter_location, 
        letter_date, 
        recipient, 
        description, 
        description_closing,
        signer_name, 
        signer_position,
        attachment // Sekarang langsung menangkap string catatan dari req.body
    } = req.body;

    const sql = `INSERT INTO letters 
        (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
    const params = [
        client_id, 
        letter_number, 
        letter_type, 
        subject,
        letter_location, 
        letter_date, 
        recipient, 
        description, 
        description_closing,
        signer_name, 
        signer_position, 
        attachment || null // Jika kosong, simpan sebagai null
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Success", id: result.insertId });
    });
});

// 3. PUT (Update Data Surat - Attachment berupa Note/Teks Biasa)
// PERBAIKAN: Menghapus 'upload.single('attachment')' dan menyederhanakan query logic
app.put('/api/letters/:id', (req, res) => {
    const id = req.params.id;
    const { 
        client_id, 
        letter_number, 
        letter_type, 
        subject,
        letter_location, 
        letter_date, 
        recipient, 
        description, 
        description_closing,
        signer_name, 
        signer_position,
        attachment // Menangkap pembaruan teks catatan
    } = req.body; 

    const sql = `UPDATE letters SET 
        client_id=?, letter_number=?, letter_type=?, subject=?, letter_location=?, 
        letter_date=?, recipient=?, description=?, description_closing=?, signer_name=?, 
        signer_position=?, attachment=? 
        WHERE id=?`;
        
    const params = [
        client_id, 
        letter_number, 
        letter_type, 
        subject,
        letter_location, 
        letter_date, 
        recipient, 
        description, 
        description_closing,
        signer_name, 
        signer_position, 
        attachment || null,
        id
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Updated Successfully" });
    });
});

// 4. DELETE (Hapus Data Surat)
// PERBAIKAN: Karena attachment bukan file fisik lagi, langsung delete baris database tanpa menghapus file di storage
app.delete('/api/letters/:id', (req, res) => {
    const id = req.params.id;
    
    const sql = "DELETE FROM letters WHERE id=?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Deleted Successfully" });
    });
});


// =========================================================================
// 1. GET - Mengambil Semua Data Surat khusus INVOICE + Array Detail Itemnya
// =========================================================================
// =========================================================================
// 1. GET - Mengambil SEMUA Data Surat (GENERAL & INVOICE) beserta Itemnya
// =========================================================================
// app.get('/api/letters/invoice', (req, res) => {
//     // Ambil SEMUA surat terlebih dahulu agar dijamin muncul di list React
//     const sqlLetters = `
//         SELECT l.*, c.name AS client_name, c.address AS client_address 
//         FROM letters l
//         LEFT JOIN client c ON l.client_id = c.id 
//         ORDER BY l.id DESC
//     `;

//     db.query(sqlLetters, (err, letters) => {
//         if (err) return res.status(500).json({ success: false, error: err.message });
//         if (!letters || letters.length === 0) return res.json([]);

//         // Ambil SEMUA item invoice untuk digabungkan di memori Node.js
//         const sqlItems = `SELECT id, letter_id, item_name, amount FROM invoice_items`;
        
//         db.query(sqlItems, (err, items) => {
//             if (err) return res.status(500).json({ success: false, error: err.message });

//             // Kelompokkan item berdasarkan letter_id
//             const itemsMap = {};
//             if (items && items.length > 0) {
//                 items.forEach(item => {
//                     if (!itemsMap[item.letter_id]) {
//                         itemsMap[item.letter_id] = [];
//                     }
//                     itemsMap[item.letter_id].push({
//                         id: item.id,
//                         item_name: item.item_name,
//                         amount: item.amount
//                     });
//                 });
//             }

//             // Gabungkan item ke suratnya masing-masing
//             const result = letters.map(letter => {
//                 // Pastikan jika tipenya kosong/null di database, dibaca sebagai GENERAL
//                 let type = letter.letter_type ? letter.letter_type.toUpperCase() : 'GENERAL';
                
//                 return {
//                     id: letter.id,
//                     client_id: letter.client_id,
//                     client_name: letter.client_name || 'Klien Tidak Diketahui',
//                     client_address: letter.client_address || 'Di Tempat',
//                     letter_number: letter.letter_number,
//                     letter_type: type, 
//                     subject: letter.subject || '',
//                     letter_location: letter.letter_location || '',
//                     letter_date: letter.letter_date,
//                     recipient: letter.recipient || '',
//                     description: letter.description || '',          
//                     description_closing: letter.description_closing || '',  
//                     signer_name: letter.signer_name || '',
//                     signer_position: letter.signer_position || '',
//                     attachment: letter.attachment || '',
//                     // Hanya pasang array rincian jika bertipe INVOICE
//                     invoice_items: type === 'INVOICE' ? (itemsMap[letter.id] || []) : []
//                 };
//             });

//             return res.json(result);
//         });
//     });
// });

app.get('/api/letters/invoice', (req, res) => {
    // Ambil SEMUA surat terlebih dahulu agar dijamin muncul di list React
    const sqlLetters = `
        SELECT l.*, c.name AS client_name, c.address AS client_address 
        FROM letters l
        LEFT JOIN client c ON l.client_id = c.id 
        ORDER BY l.id DESC
    `;

    db.query(sqlLetters, (err, letters) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!letters || letters.length === 0) return res.json([]);

        // Ambil SEMUA item invoice untuk digabungkan di memori Node.js
        const sqlItems = `SELECT id, letter_id, item_name, amount FROM invoice_items`;
        
        db.query(sqlItems, (err, items) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            // Kelompokkan item berdasarkan letter_id
            const itemsMap = {};
            if (items && items.length > 0) {
                items.forEach(item => {
                    if (!itemsMap[item.letter_id]) {
                        itemsMap[item.letter_id] = [];
                    }
                    itemsMap[item.letter_id].push({
                        id: item.id,
                        item_name: item.item_name,
                        amount: item.amount
                    });
                });
            }

            // Gabungkan item ke suratnya masing-masing
            const result = letters.map(letter => {
                // Pastikan jika tipenya kosong/null di database, dibaca sebagai GENERAL
                let type = letter.letter_type ? letter.letter_type.toUpperCase() : 'GENERAL';
                
                // Ambil list items untuk letter saat ini
                const currentInvoiceItems = type === 'INVOICE' ? (itemsMap[letter.id] || []) : [];
                
                return {
                    id: letter.id,
                    client_id: letter.client_id,
                    client_name: letter.client_name || 'Klien Tidak Diketahui',
                    client_address: letter.client_address || 'Di Tempat',
                    letter_number: letter.letter_number,
                    letter_type: type, 
                    subject: letter.subject || '',
                    letter_location: letter.letter_location || '',
                    letter_date: letter.letter_date,
                    recipient: letter.recipient || '',
                    description: letter.description || '',          
                    description_closing: letter.description_closing || '',  
                    signer_name: letter.signer_name || '',
                    signer_position: letter.signer_position || '',
                    attachment: letter.attachment || '',
                    // Properti baru tepat di bawah attachment
                    first_item_name: currentInvoiceItems.length > 0 ? currentInvoiceItems[0].item_name : '',
                    invoice_items: currentInvoiceItems
                };
            });

            return res.json(result);
        });
    });
});

// =========================================================================
// 2. POST - Menyimpan Data Invoice Baru beserta List Item Rinciannya
// =========================================================================
app.post('/api/letters/invoice', (req, res) => {
    const { 
        client_id, letter_number, letter_type, subject, letter_location, letter_date, 
        recipient, description, description_closing, signer_name, signer_position, attachment, invoice_items 
    } = req.body;

    // Default ke 'INVOICE' jika frontend lupa mengirim tipe data surat
    const targetType = letter_type || 'INVOICE';

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // PERBAIKAN: Nilai ketiga disesuaikan secara dinamis menggunakan targetType
        const sqlLetter = `INSERT INTO letters 
            (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(sqlLetter, [client_id, letter_number, targetType, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment], (err, result) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ success: false, error: "Gagal simpan letters: " + err.message }));
            }

            const letterId = result.insertId;

            // Simpan item ke tabel anak invoice_items jika ada rincian tabelnya
            if (invoice_items && invoice_items.length > 0) {
                const sqlItems = `INSERT INTO invoice_items (letter_id, item_name, amount) VALUES ?`;
                
                const values = invoice_items
                    .filter(item => item && item.item_name && String(item.item_name).trim() !== "") 
                    .map(item => [letterId, item.item_name, parseFloat(item.amount) || 0]);

                if (values.length === 0) {
                    return db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false }));
                        return res.json({ success: true, message: "Invoice disimpan tanpa list item." });
                    });
                }

                db.query(sqlItems, [values], (err) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ success: false, error: "Gagal menyimpan list item: " + err.message }));
                    }
                    
                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false }));
                        return res.json({ success: true, message: "Dokumen Invoice & List Item sukses diarsipkan!" });
                    });
                });
            } else {
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ success: false }));
                    return res.json({ success: true, message: "Invoice tanpa detail item berhasil disimpan." });
                });
            }
        });
    });
});

// =========================================================================
// 3. PUT - Memperbarui (Edit) Data Surat / Invoice Terpilih
// =========================================================================
app.put('/api/letters/invoice/:id', (req, res) => {
    const { id } = req.params; 
    const { 
        client_id, letter_number, letter_type, subject, letter_location, letter_date, 
        recipient, description, description_closing, signer_name, signer_position, attachment, invoice_items 
    } = req.body;

    const targetType = letter_type || 'INVOICE';

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // PERBAIKAN: Menambahkan penyetelan dinamis 'letter_type = ?' agar saat mengedit, tipenya tidak otomatis tertimpa jadi invoice
        const sqlUpdateLetter = `UPDATE letters SET 
            client_id = ?, letter_number = ?, letter_type = ?, subject = ?, letter_location = ?, letter_date = ?, 
            recipient = ?, description = ?, description_closing = ?, signer_name = ?, signer_position = ?, attachment = ?
            WHERE id = ?`;

        db.query(sqlUpdateLetter, [client_id, letter_number, targetType, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment, id], (err) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ success: false, error: "Gagal update letters: " + err.message }));
            }

            // Bersihkan item rincian lama terlebih dahulu
            const sqlDeleteItems = `DELETE FROM invoice_items WHERE letter_id = ?`;
            
            db.query(sqlDeleteItems, [id], (err) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ success: false, error: "Gagal membersihkan item lama: " + err.message }));
                }

                // Proses masukkan kembali rincian item jika data barunya dikirim dan tipenya adalah INVOICE
                if (targetType === 'INVOICE' && invoice_items && invoice_items.length > 0) {
                    const sqlInsertItems = `INSERT INTO invoice_items (letter_id, item_name, amount) VALUES ?`;
                    
                    const bulkValues = invoice_items
                        .filter(item => item && item.item_name && String(item.item_name).trim() !== "")
                        .map(item => [id, item.item_name, parseFloat(item.amount) || 0]);

                    if (bulkValues.length === 0) {
                        return db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false }));
                            return res.json({ success: true, message: "Invoice diperbarui tanpa detail item." });
                        });
                    }

                    db.query(sqlInsertItems, [bulkValues], (err) => {
                        if (err) {
                            return db.rollback(() => res.status(500).json({ success: false, error: "Gagal menyimpan item baru: " + err.message }));
                        }

                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false }));
                            return res.json({ success: true, message: "Data Invoice & Rincian Item sukses diperbarui!" });
                        });
                    });
                } else {
                    // Jika bertipe GENERAL atau tidak ada item rincian dikirim
                    db.commit((err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false }));
                        return res.json({ success: true, message: "Data Surat berhasil diperbarui!" });
                    });
                }
            });
        });
    });
});

// =========================================================================
// 4. POST - Menyimpan Surat Umum (GENERAL) Baru
// =========================================================================
app.post('/api/letters/general', (req, res) => {
    const { 
        client_id, letter_number, subject, letter_location, 
        letter_date, recipient, description, signer_name, signer_position, attachment 
    } = req.body;

    const sql = `INSERT INTO letters 
        (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, signer_name, signer_position, attachment) 
        VALUES (?, ?, 'GENERAL', ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [client_id, letter_number, subject, letter_location, letter_date, recipient, description, signer_name, signer_position, attachment], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, message: "Surat Umum berhasil disimpan!", id: result.insertId });
    });
});

// =========================================================================
// 5. PUT - Memperbarui (Edit) Khusus Surat Umum Jalur Cadangan Frontend
// =========================================================================
app.put('/api/letters/general/:id', (req, res) => {
    const { id } = req.params;
    const { 
        client_id, letter_number, subject, letter_location, 
        letter_date, recipient, description, signer_name, signer_position, attachment 
    } = req.body;

    const sql = `UPDATE letters SET 
        client_id = ?, letter_number = ?, letter_type = 'GENERAL', subject = ?, letter_location = ?, 
        letter_date = ?, recipient = ?, description = ?, signer_name = ?, signer_position = ?, attachment = ?
        WHERE id = ?`;

    db.query(sql, [client_id, letter_number, subject, letter_location, letter_date, recipient, description, signer_name, signer_position, attachment, id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, message: "Data Surat Umum berhasil diupdate!" });
    });
});

// --- API MENU MANAGEMENT (CRUD menu) ---

// 1. READ ALL (GET DATA)
app.get('/api/menus', (req, res) => {
    // Ambil semua data menu diurutkan berdasarkan urutan menu
    const sql = 'SELECT * FROM menu ORDER BY menu_order ASC';
    
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        
        // 1. Fungsi rekursif untuk mencari sub-menu ke dalam
        const buildMenuTree = (parentId) => {
            const currentLevelMenus = [];

            result.forEach(item => {
                // Abaikan menu_id = 1 agar tidak masuk ke dalam list (karena 1 adalah ID penanda Induk)
                if (item.menu_id === 1) return;

                // Cek apakah item ini memiliki parent_id yang cocok
                if (item.parent_id === parentId) {
                    // Cari anak dari menu ini secara berulang (rekursif)
                    const subMenus = buildMenuTree(item.menu_id);
                    
                    currentLevelMenus.push({
                        ...item,
                        subs: subMenus // Menghasilkan struktur bersarang dinamis ke properti 'subs'
                    });
                }
            });

            // Urutkan berdasarkan menu_order di setiap levelnya
            return currentLevelMenus.sort((a, b) => a.menu_order - b.menu_order);
        };

        // 2. Mulai perulangan dari parent_id = 1 (karena semua induk utama memiliki parent_id = 1)
        const menuTree = buildMenuTree(1);

        // 3. Kembalikan hasilnya ke React frontend
        return res.json(menuTree);
    });
});


// 1. READ ALL (GET DATA)
app.get('/api/menus-access', (req, res) => {
    // Ambil semua data menu diurutkan berdasarkan urutan menu
    const sql = 'SELECT menu_id,  title AS menu_name, url AS menu_url, icon AS menu_icon, class_active, parent_id, menu_order FROM menu ORDER BY menu_order ASC';
    
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        
        const parents = [];
        const children = [];

        result.forEach(item => {
            // REVISI: Menggunakan properti 'subs' agar langsung dikenali oleh React frontend
            if (item.menu_id === 1) {
                parents.push({ ...item, subs: [] });
            } else if (item.parent_id === 1 || !item.parent_id) {
                parents.push({ ...item, subs: [] });
            } else {
                children.push(item);
            }
        });

        // Masukkan setiap child ke parent_id yang cocok
        children.forEach(child => {
            const parent = parents.find(p => p.menu_id === child.parent_id);
            if (parent) {
                parent.subs.push(child); // REVISI: ke 'subs'
            } else {
                parents.push({ ...child, subs: [] }); // REVISI: ke 'subs'
            }
        });

        // Urutkan kembali parent berdasarkan menu_order asli database
        parents.sort((a, b) => a.menu_order - b.menu_order);

        return res.json(parents);
    });
});
// 2. CREATE (POST DATA)
 app.post('/api/menus', (req, res) => {
    const { 
        parent_id, 
        title, 
        url, 
        description, 
        menu_order, 
        icon, 
        is_active,
        // --- TAMBAHKAN FIELD HAK AKSES DARI REQ.BODY ---
        is_view,
        is_create,
        is_edit,
        is_delete,
        is_export,
        is_duplicate,
        is_unlock
    } = req.body;

    // Normalisasi parent_id: Jika 0, '', atau null, ubah jadi NULL (atau 0 sesuai standar DB Anda)
    const formattedParentId = (parent_id === '' || parent_id === null || parent_id === undefined) ? null : parent_id;

    // Normalisasi Flag: Mengubah nilai boolean/string/undefined menjadi angka Integer (1 atau 0)
    const parseFlag = (val, defaultValue = 1) => {
        if (val === undefined || val === null) return defaultValue;
        return (val === 1 || val === '1' || val === true) ? 1 : 0;
    };

    const sql = `INSERT INTO menu (
        parent_id, 
        title, 
        url, 
        description, 
        menu_order, 
        icon, 
        is_active,
        is_view,
        is_create,
        is_edit,
        is_delete,
        is_export,
        is_duplicate,
        is_unlock
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        formattedParentId,
        title || '',
        url || '',
        description || '',
        menu_order || 1,
        icon || '',
        parseFlag(is_active, 1),
        parseFlag(is_view, 1),      // Default ke 1 jika tidak dikirim
        parseFlag(is_create, 1),
        parseFlag(is_edit, 1),
        parseFlag(is_delete, 1),
        parseFlag(is_export, 1),
        parseFlag(is_duplicate, 1),
        parseFlag(is_unlock, 1)
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting menu:", err);
            return res.status(500).json({ 
                error: "Gagal menyimpan data menu ke database", 
                details: err.message 
            });
        }
        
        return res.status(201).json({ 
            message: "Menu berhasil disimpan", 
            id: result.insertId 
        });
    });
});  

// 3. UPDATE (PUT DATA)
app.put('/api/menus/:id', (req, res) => {
    const { id } = req.params;
    const {
        parent_id, title, url, description, menu_order, type,
        is_view, is_create, is_edit, is_delete, is_export, 
        is_duplicate, is_unlock, is_active, class_active, icon
    } = req.body;

    const query = `
        UPDATE menu SET 
        parent_id = ?, title = ?, url = ?, description = ?, menu_order = ?, type = ?, 
        is_view = ?, is_create = ?, is_edit = ?, is_delete = ?, is_export = ?, 
        is_duplicate = ?, is_unlock = ?, is_active = ?, class_active = ?, icon = ?
        WHERE menu_id = ?
    `;

    const values = [
        parent_id || null, title, url || null, description || null, menu_order, type || null,
        is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active,
        class_active || null, icon || null, id
    ];

    db.query(query, values, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu berhasil diperbarui' });
    });
});

// 4. DELETE (DELETE DATA)
app.delete('/api/menus/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM menu WHERE menu_id = ?';

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu berhasil dihapus' });
    });
});

// ==========================================
// API PROJECT DOCUMENTS (CRUD POLA SERAGAM)
// ==========================================

// 1. GET (Ambil Semua Data Dokumen)
app.get('/api/project-documents', (req, res) => {
    const sql = "SELECT * FROM project_documents ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json(result);
    });
});

// 2. GET BY PROJECT ID (Ambil dokumen berdasarkan id project induknya)
app.get('/api/project-documents/project/:project_id', (req, res) => {
    const sql = "SELECT * FROM project_documents WHERE project_id = ?";
    db.query(sql, [req.params.project_id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "Data tidak ditemukan" });
        return res.json(result[0]);
    });
});

// 3. POST (Tambah Data Dokumen Baru)
app.post('/api/project-documents', (req, res) => {
    const {
        project_id, location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment
    } = req.body;

    const sql = `INSERT INTO project_documents (
        project_id, location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        project_id, location,
        inspection_date ? inspection_date.split('T')[0] : null, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date ? progress_date.split('T')[0] : null, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date ? handover_date.split('T')[0] : null, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Success", id: result.insertId });
    });
});

// 4. PUT (Update Data Dokumen Berdasarkan ID)
app.put('/api/project-documents/:id', (req, res) => {
    const {
        project_id, location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment
    } = req.body;
    const id = req.params.id;

    const sql = `UPDATE project_documents SET 
        project_id=?, location=?, 
        inspection_date=?, inspection_officer_name_1=?, inspection_officer_role_1=?, inspection_officer_name_2=?, inspection_officer_role_2=?, inspection_description=?,
        progress_date=?, progress_officer_name_1=?, progress_officer_role_1=?, progress_officer_name_2=?, progress_officer_role_2=?, progress_description=?,
        handover_date=?, handover_officer_name_1=?, handover_officer_role_1=?, handover_officer_name_2=?, handover_officer_role_2=?, handover_description=?, company_1=?, company_2=?, progress_status=?, handover_status=?, bapp_attachment=? 
        WHERE id=?`;

    const params = [
        project_id, location,
        inspection_date ? inspection_date.split('T')[0] : null, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date ? progress_date.split('T')[0] : null, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date ? handover_date.split('T')[0] : null, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment,
        id
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Updated Successfully" });
    });
});

// 5. DELETE (Hapus Data Dokumen)
app.delete('/api/project-documents/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM project_documents WHERE id=?";
    
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Deleted Successfully" });
    });
});

// Di file backend Express Anda:
app.put('/api/project-documents/status/:id', (req, res) => {
    const { id } = req.params;
    const {  
        progress_status,  // <-- PASTIKAN INI DITANGKAP
        handover_status   // <-- PASTIKAN INI DITANGKAP
    } = req.body;

    const sql = `UPDATE project_documents SET  
        progress_status = ?, 
        handover_status = ? 
        WHERE id = ?`;

    db.query(sql, [progress_status, handover_status, id], (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Data terupdate!" });
    });
});



 // ==========================================
// 1. GET ALL ROLES
// ==========================================
app.get('/api/roles', (req, res) => {
    // Mengambil semua kolom data role
    const sql = "SELECT role_id, name_role, description, `lock` FROM roles ORDER BY name_role ASC";
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching roles:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(result);
    });
});

// ==========================================
// 2. POST NEW ROLE
// ==========================================
app.post('/api/roles', (req, res) => {
    const { name_role, description, lock } = req.body;
    
    if (!name_role) {
        return res.status(400).json({ error: "Field 'name_role' is required" });
    }

    const sql = "INSERT INTO roles (name_role, description, `lock`) VALUES (?, ?, ?)";
    // Jika nilai lock tidak dikirim, otomatis diatur default ke 0 (unlocked)
    const values = [name_role, description || null, lock !== undefined ? lock : 0];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting role:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json({ message: "Role added successfully", role_id: result.insertId });
    });
});

// ==========================================
// 3. PUT (UPDATE) ROLE & TOGGLE LOCK
// ==========================================
app.put('/api/roles/:id', (req, res) => {
    const roleId = req.params.id;
    const { name_role, description, lock } = req.body;

    if (!name_role) {
        return res.status(400).json({ error: "Field 'name_role' is required" });
    }

    // DISESUAIKAN: Validasi pengecekan lock lama dihapus agar frontend bisa 
    // mengirimkan request untuk merubah status lock (dari 1 ke 0 atau sebaliknya)
    const sql = "UPDATE roles SET name_role = ?, description = ?, `lock` = ? WHERE role_id = ?";
    const values = [name_role, description || null, lock !== undefined ? lock : 0, roleId];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating role:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Role not found" });
        }
        
        res.json({ message: "Role updated successfully" });
    });
});

// ==========================================
// 4. DELETE ROLE (PROTEKSI KETAT)
// ==========================================
app.delete('/api/roles/:id', (req, res) => {
    const roleId = req.params.id;

    // Tetap pertahankan proteksi ganda di database: Cek status lock sebelum menghapus
    db.query("SELECT `lock` FROM roles WHERE role_id = ?", [roleId], (checkErr, checkResult) => {
        if (checkErr) return res.status(500).json(checkErr);
        if (checkResult.length === 0) return res.status(404).json({ error: "Role not found" });

        // Jika di database statusnya masih terkunci (1), blokir aksi hapus!
        if (checkResult[0].lock === 1 || checkResult[0].lock === true) {
            return res.status(403).json({ error: "This role is system locked and cannot be deleted" });
        }

        // Jika aman (lock === 0), jalankan proses hapus
        const sql = "DELETE FROM roles WHERE role_id = ?";
        db.query(sql, [roleId], (err, result) => {
            if (err) {
                console.error("Error deleting role:", err);
                return res.status(500).json({ error: "Database error", details: err });
            }
            res.json({ message: "Role deleted successfully" });
        });
    });
});
 

// ==========================================
// 1. GET ALL USERS (Dengan nama Role)
// ==========================================
app.get('/api/users/roles', (req, res) => {
    // Menggunakan JOIN untuk mengambil data user beserta nama rolenya dari tabel roles
    const sql = `
        SELECT u.id, u.email, u.name, u.role_id, u.phone, u.gender, u.is_active, r.name_role 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.role_id 
        ORDER BY u.id DESC
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(result);
    });
});

// ==========================================
// 2. POST NEW USER (Tambah User)
// ==========================================

app.post('/api/users', async (req, res) => {
    const { email, password, name, role_id, phone, gender, is_active } = req.body;

    // Log debug untuk memastikan data dari frontend benar-benar masuk ke backend
    console.log("Data diterima backend:", { email, name, role_id });

    // Validasi input wajib
    if (!email || !password || !name || !role_id) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // PERBAIKAN 1: Amankan enkripsi & pastikan saltRounds didefinisikan (misal: const saltRounds = 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // PERBAIKAN 2: Pastikan role_id dikonversi ke Integer jika DB menggunakan tipe INT
        const cleanRoleId = parseInt(role_id, 10);

        if (isNaN(cleanRoleId)) {
            return res.status(400).json({ error: "Invalid Role ID format (Must be a number)" });
        }

        const activeValue = (is_active === false || is_active === 0 || is_active === '0') ? 0 : 1;

        const sql = "INSERT INTO users (email, password, name, role_id, phone, gender, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const values = [email, hashedPassword, name, cleanRoleId, phone || null, gender || null, activeValue];

        db.query(sql, values, (err, result) => {
            if (err) {
                // Log detail error di terminal server Anda untuk debugging
                console.error("Database Error Detail:", err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: "Email already registered" });
                }
                // Jika foreign key bermasalah (role_id tidak ada di tabel roles)
                if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
                    return res.status(400).json({ error: "The selected Role ID does not exist in roles table" });
                }

                return res.status(500).json({ error: "Database error", details: err.message });
            }
            
            res.json({ message: "User created successfully", id: result.insertId });
        });
    } catch (error) {
        console.error("Hashing Error Detail:", error);
        res.status(500).json({ error: "Internal server error during processing" });
    }
});
// ==========================================
// 3. PUT (UPDATE) USER
// ==========================================
 app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { email, password, name, role_id, phone, gender, is_active } = req.body;

    // Log debug untuk memantau data yang masuk saat proses edit
    console.log(`Mengubah user ID ${userId} dengan data:`, { email, name, role_id });

    // Validasi input wajib (tidak termasuk password karena password bersifat opsional saat edit)
    if (!email || !name || !role_id) {
        return res.status(400).json({ error: "Email, Name, and Role are required" });
    }

    try {
        // PERBAIKAN 1: Pastikan role_id dikonversi ke Integer agar klop dengan tipe data INT MySQL
        const cleanRoleId = parseInt(role_id, 10);
        if (isNaN(cleanRoleId)) {
            return res.status(400).json({ error: "Invalid Role ID format (Must be a number)" });
        }

        let sql;
        let values;

        // Jika password diisi (tidak kosong dan bukan spasi doang), enkripsi password baru
        const activeValue = (is_active === false || is_active === 0 || is_active === '0') ? 0 : 1;

        if (password && password.trim() !== "") {
            // PERBAIKAN 2: Gunakan saltRounds 10 secara langsung untuk menghindari 'saltRounds is not defined'
            const hashedPassword = await bcrypt.hash(password, 10);
            
            sql = "UPDATE users SET email = ?, password = ?, name = ?, role_id = ?, phone = ?, gender = ?, is_active = ? WHERE id = ?";
            values = [email, hashedPassword, name, cleanRoleId, phone || null, gender || null, activeValue, userId];
        } else {
            // Jika password kosong, update field lainnya tanpa mengubah password lama di database
            sql = "UPDATE users SET email = ?, name = ?, role_id = ?, phone = ?, gender = ?, is_active = ? WHERE id = ?";
            values = [email, name, cleanRoleId, phone || null, gender || null, activeValue, userId];
        }

        db.query(sql, values, (err, result) => {
            if (err) {
                // Log detail error ke terminal server agar mudah dilacak
                console.error("Database Update Error Detail:", err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: "Email already used by another account" });
                }
                
                // Proteksi jika role_id yang dilempar tidak terdaftar di tabel roles (Foreign Key Constraint)
                if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
                    return res.status(400).json({ error: "The selected Role ID does not exist in roles table" });
                }

                return res.status(500).json({ error: "Database error", details: err.message });
            }

            // Jika query sukses tapi tidak ada baris yang berubah (ID salah)
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({ message: "User updated successfully" });
        });
    } catch (error) {
        console.error("Internal Server Error Detail:", error);
        res.status(500).json({ error: "Internal server error during processing" });
    }
});

// ==========================================
// 4. DELETE USER
// ==========================================
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Error deleting user:", err);
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json({ message: "User deleted successfully" });
    });
});

// --- API SIMPAN DATA WAJAH USER ---
app.post('/api/users/:id/face', (req, res) => {
    const userId = req.params.id;
    const { descriptor } = req.body;
    if (!Array.isArray(descriptor) || descriptor.length < 64) {
        return res.status(400).json({ message: 'Data wajah tidak valid' });
    }

    db.query('SELECT id FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Face Register Database Error:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan pada server', details: err.message });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        db.query('UPDATE users SET face_descriptor = ? WHERE id = ?', [JSON.stringify(descriptor), userId], (err2) => {
            if (err2) {
                console.error('Face Register Update Error:', err2);
                return res.status(500).json({ message: 'Gagal menyimpan data wajah', details: err2.message });
            }
            res.json({ message: 'Data wajah berhasil disimpan' });
        });
    });
});

// --- API HAPUS DATA WAJAH USER ---
app.delete('/api/users/:id/face', (req, res) => {
    const userId = req.params.id;
    db.query('UPDATE users SET face_descriptor = NULL WHERE id = ?', [userId], (err) => {
        if (err) {
            console.error('Face Delete Error:', err);
            return res.status(500).json({ message: 'Gagal menghapus data wajah', details: err.message });
        }
        res.json({ message: 'Data wajah berhasil dihapus' });
    });
});
 
  // =========================================================================
// 1. GET DATA MATRIKS (MURNI STRING 1 DAN '0')
// =========================================================================
 
 app.get('/api/module-authority/:role_id', (req, res) => {
    const roleId = req.params.role_id;

    // 1. Kueri SQL: Ambil data menu LENGKAP dengan status kolom konfigurasi hak aksesnya
    const sqlMenu = `
        SELECT 
            menu_id, 
            title, 
            parent_id, 
            menu_order, 
            is_active,
            is_view, 
            is_create, 
            is_edit, 
            is_delete, 
            is_export, 
            is_duplicate, 
            is_unlock
        FROM menu 
        WHERE is_active = 1
        ORDER BY menu_order ASC`;
    
    db.query(sqlMenu, (errMenu, menus) => {
        if (errMenu) return res.status(500).json({ error: errMenu.message });

        // 2. Ambil data hak akses role dari tabel module_authority
        const sqlAuth = "SELECT * FROM module_authority WHERE role_id = ?";
        db.query(sqlAuth, [roleId], (errAuth, authorities) => {
            if (errAuth) return res.status(500).json({ error: errAuth.message });

            // 3. Masukkan hak akses tabel transaksi ke dalam Map (Key-Value)
           // Helper fungsi konversi aman (letakkan di luar loop atau di atas handler API)
            const parseFlag = (val) => (val === 1 || val === '1' || val === true ? 1 : 0);

            const authMap = {};
            authorities.forEach(auth => {
                authMap[String(auth.menu_id)] = {
                    is_view: parseFlag(auth.is_view),
                    is_create: parseFlag(auth.is_create),
                    is_edit: parseFlag(auth.is_edit),
                    is_delete: parseFlag(auth.is_delete),
                    is_export: parseFlag(auth.is_export),
                    is_duplicate: parseFlag(auth.is_duplicate),
                    is_unlock: parseFlag(auth.is_unlock)
                };
            });

            // 4. Strukturkan ulang flat data item dari database
            const matrixData = menus.map(menu => {
                const idString = String(menu.menu_id);
                
                return {
                    menu_id: menu.menu_id,
                    title: menu.title,
                    parent_id: menu.parent_id,
                    menu_order: menu.menu_order,
                    is_active: parseFlag(menu.is_active),
                    
                    menu_config: {
                        is_view: parseFlag(menu.is_view),
                        is_create: parseFlag(menu.is_create),
                        is_edit: parseFlag(menu.is_edit),
                        is_delete: parseFlag(menu.is_delete),
                        is_export: parseFlag(menu.is_export),
                        is_duplicate: parseFlag(menu.is_duplicate),
                        is_unlock: parseFlag(menu.is_unlock)
                    },
                    
                    access: authMap[idString] || {
                        is_view: 0, 
                        is_create: 0, 
                        is_edit: 0, 
                        is_delete: 0, 
                        is_export: 0, 
                        is_duplicate: 0, 
                        is_unlock: 0
                    }
                };
            });

            // 5. PENYUSUNAN STRUKTUR POHON (TREE BUILDER) BERDASARKAN PARENT_ID VIA LINEAR MAP
            const menuMap = {};
            const menuTree = [];

            // Langkah A: Daftarkan semua item ke dalam Map objek dan beri array 'subs' kosong
            matrixData.forEach(item => {
                menuMap[String(item.menu_id)] = { ...item, subs: [] };
            });

            // Langkah B: Hubungkan anak menu ke array 'subs' milik induknya masing-masing
            matrixData.forEach(item => {
                const currentItemInMap = menuMap[String(item.menu_id)];
                const pId = item.parent_id;

                // Aturan penentuan MENU UTAMA (ROOT LEVEL):
                // Dianggap menu utama jika parent_id kosong, bernilai 0, atau bernilai 1 (sesuai konfigurasi database Anda)
                const isRoot = !pId || pId === 0 || pId === 0 || pId === 1 || pId === 1;

                if (isRoot) {
                    // Masuk sebagai layer paling luar (Root Node)
                    menuTree.push(currentItemInMap);
                } else {
                    // Jika memiliki induk, cari data induknya di dalam Map menggunakan parent_id
                    const parentItem = menuMap[String(pId)];
                    if (parentItem) {
                        // Masukkan menu ini ke dalam sub-menu (subs) dari induknya
                        parentItem.subs.push(currentItemInMap);
                    } else {
                        // Jalur Cadangan: Jika induknya tidak aktif/tidak terdaftar, 
                        // tetap tampilkan di luar agar data hak aksesnya tidak hilang tersembunyi
                        menuTree.push(currentItemInMap);
                    }
                }
            });

            // Langkah C: Fungsi pembantu untuk mengurutkan menu berdasarkan No urut (menu_order)
            const sortTreeRecursive = (nodes) => {
                nodes.sort((a, b) => (Number(a.menu_order) || 0) - (Number(b.menu_order) || 0));
                nodes.forEach(node => {
                    if (node.subs && node.subs.length > 0) {
                        sortTreeRecursive(node.subs);
                    }
                });
            };
            
            // Eksekusi sorting data pohon
            sortTreeRecursive(menuTree);

            // Kirim struktur data pohon menu berundak ke React Frontend
            return res.json(menuTree);
        });
    });
});

// =========================================================================
// 2. POST SAVE (MURNI STRING 1 DAN '0')
// =========================================================================
 app.post('/api/module-authority/save', (req, res) => {
    const { role_id, permissions } = req.body;

    if (!role_id) return res.status(400).json({ error: "Role ID wajib dipilih!" });

    // Helper untuk konversi aman dari boolean/string/number ke 1 atau 0
    const parseFlag = (val) => (val === 1 || val === '1' || val === true ? 1 : 0);

    const deleteSql = "DELETE FROM module_authority WHERE role_id = ?";
    db.query(deleteSql, [role_id], (delErr) => {
        if (delErr) return res.status(500).json({ error: delErr.message });

        // Jika array permissions kosong, langsung berikan respons sukses setelah delete
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.json({ message: "Hak akses berhasil dibersihkan!" });
        }

        const insertSql = `
            INSERT INTO module_authority 
            (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock) 
            VALUES ?
        `;

        const values = permissions.map(p => [
            role_id,
            p.menu_id,
            parseFlag(p.is_view),
            parseFlag(p.is_create),
            parseFlag(p.is_edit),
            parseFlag(p.is_delete),
            parseFlag(p.is_export),
            parseFlag(p.is_duplicate),
            parseFlag(p.is_unlock)
        ]);

        db.query(insertSql, [values], (insErr, result) => {
            if (insErr) {
                console.error("Error inserting module_authority:", insErr);
                return res.status(500).json({ error: "Gagal menyimpan hak akses ke database.", details: insErr.message });
            }
            
            return res.json({ message: "Hak akses berhasil disimpan!", affectedRows: result.affectedRows });
        });
    });
});

const APP_SETTINGS_DEFAULTS = {
    site_title: 'Admin Panel',
    site_description: 'StrikingDash React Web Application',
    logo: '',
    meta_title: 'Admin Panel',
    meta_description: 'StrikingDash React Web Application',
    meta_keywords: 'admin, dashboard, react'
};

app.get('/api/app-settings', (req, res) => {
    db.query('SELECT * FROM app_settings WHERE id = 1', (err, rows) => {
        if (err) return res.status(500).json(err);
        const settings = Object.assign({}, APP_SETTINGS_DEFAULTS, rows[0] || {});
        return res.json(settings);
    });
});

app.put('/api/app-settings', upload.single('logo'), (req, res) => {
    db.query('SELECT * FROM app_settings WHERE id = 1', (err, rows) => {
        if (err) return res.status(500).json(err);
        const existing = Object.assign({}, APP_SETTINGS_DEFAULTS, rows[0] || {});
        const body = req.body || {};
        const siteTitle = String(body.site_title !== undefined ? body.site_title : existing.site_title).trim();
        const siteDescription = String(body.site_description !== undefined ? body.site_description : existing.site_description).trim();
        let metaTitle = String(body.meta_title !== undefined ? body.meta_title : existing.meta_title).trim();
        let metaDescription = String(body.meta_description !== undefined ? body.meta_description : existing.meta_description).trim();
        const metaKeywords = String(body.meta_keywords !== undefined ? body.meta_keywords : existing.meta_keywords).trim();
        let logo = existing.logo || '';

        if (!siteTitle) return res.status(400).json({ message: 'Site title wajib diisi' });
        if (!metaTitle) metaTitle = siteTitle;
        if (!metaDescription) metaDescription = siteDescription;

        const removeLogo = String(body.remove_logo) === '1' || String(body.remove_logo) === 'true';
        if (removeLogo) {
            logo = '';
        }

        if (req.file) {
            logo = req.file.filename;
        }

        const sql = `INSERT INTO app_settings
            (id, site_title, site_description, logo, meta_title, meta_description, meta_keywords, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                site_title = VALUES(site_title),
                site_description = VALUES(site_description),
                logo = VALUES(logo),
                meta_title = VALUES(meta_title),
                meta_description = VALUES(meta_description),
                meta_keywords = VALUES(meta_keywords),
                updated_at = VALUES(updated_at)`;
        const params = [siteTitle, siteDescription, logo, metaTitle, metaDescription, metaKeywords];

        db.query(sql, params, (saveErr) => {
            if (saveErr) return res.status(500).json(saveErr);
            if (removeLogo && existing.logo) {
                const oldPath = path.join(__dirname, 'uploads', path.basename(existing.logo));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            db.query('SELECT * FROM app_settings WHERE id = 1', (readErr, updatedRows) => {
                if (readErr) return res.status(500).json(readErr);
                return res.json({
                    message: 'Konfigurasi aplikasi berhasil disimpan!',
                    settings: Object.assign({}, APP_SETTINGS_DEFAULTS, updatedRows[0] || {})
                });
            });
        });
    });
});

app.post('/api/backups', async (req, res) => {
    try {
        await ensureBackupsTable();
        await fsp.mkdir(backupsDir, { recursive: true });
        const note = req.body && req.body.note !== undefined ? String(req.body.note).slice(0, 255) : null;
        const createdBy = req.body && req.body.created_by !== undefined ? String(req.body.created_by).slice(0, 150) : null;
        const createdAt = new Date();
        const insertResult = await dbQuery(
            'INSERT INTO backups (filename, original_name, size, tables_count, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['', '', 0, 0, note, createdBy, createdAt]
        );
        const id = insertResult.insertId;
        const { sql, tablesCount } = await createDatabaseDump();
        const stamp = createdAt.toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${stamp}-${id}.sql`;
        const originalName = filename;
        const filePath = path.join(backupsDir, filename);
        await fsp.writeFile(filePath, sql, 'utf8');
        const size = Buffer.byteLength(sql, 'utf8');
        await dbQuery(
            'UPDATE backups SET filename = ?, original_name = ?, size = ?, tables_count = ? WHERE id = ?',
            [filename, originalName, size, tablesCount, id]
        );
        return res.status(201).json({
            id,
            filename,
            size,
            tables: tablesCount,
            created_at: createdAt.toISOString(),
            note
        });
    } catch (err) {
        console.error('Backup create error:', err);
        return res.status(500).json({ message: 'Gagal membuat backup', error: err.message });
    }
});

app.get('/api/backups', async (req, res) => {
    try {
        await ensureBackupsTable();
        const rows = await dbQuery('SELECT id, filename, original_name, size, tables_count, note, created_by, created_at FROM backups ORDER BY id DESC');
        const data = rows.map((row) => ({
            id: row.id,
            filename: row.filename,
            original_name: row.original_name,
            size: row.size || 0,
            tables: row.tables_count || 0,
            note: row.note,
            created_by: row.created_by,
            created_at: formatBackupDate(row.created_at)
        }));
        return res.json(data);
    } catch (err) {
        console.error('Backup list error:', err);
        return res.status(500).json({ message: 'Gagal mengambil data backup', error: err.message });
    }
});

app.get('/api/backups/:id/download', async (req, res) => {
    try {
        await ensureBackupsTable();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const rows = await dbQuery('SELECT * FROM backups WHERE id = ? LIMIT 1', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const backup = rows[0];
        const filePath = path.join(backupsDir, path.basename(backup.filename || ''));
        if (!backup.filename || !fs.existsSync(filePath)) return res.status(404).json({ message: 'File backup tidak ditemukan' });
        const downloadName = path.basename(backup.original_name || backup.filename);
        res.setHeader('Content-Type', 'application/sql; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName.replace(/"/g, '')}"`);
        return fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error('Backup download error:', err);
        return res.status(500).json({ message: 'Gagal mengunduh backup', error: err.message });
    }
});

app.post('/api/backups/:id/restore', async (req, res) => {
    let restoreDb;
    try {
        await ensureBackupsTable();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const rows = await dbQuery('SELECT * FROM backups WHERE id = ? LIMIT 1', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const backup = rows[0];
        const filePath = path.join(backupsDir, path.basename(backup.filename || ''));
        if (!backup.filename || !fs.existsSync(filePath)) return res.status(404).json({ message: 'File backup tidak ditemukan' });
        const sql = await fsp.readFile(filePath, 'utf8');
        restoreDb = mysql.createConnection(Object.assign({}, dbConfig, { multipleStatements: true }));
        const restoreQuery = util.promisify(restoreDb.query).bind(restoreDb);
        await restoreQuery(sql);
        restoreDb.destroy();
        restoreDb = null;
        return res.json({ success: true, restored_at: new Date().toISOString() });
    } catch (err) {
        if (restoreDb) {
            try { restoreDb.destroy(); } catch (e) {}
        }
        console.error('Backup restore error:', err);
        return res.status(500).json({ message: 'Gagal restore backup', error: err.message });
    }
});

app.delete('/api/backups/:id', async (req, res) => {
    try {
        await ensureBackupsTable();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const rows = await dbQuery('SELECT * FROM backups WHERE id = ? LIMIT 1', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Backup tidak ditemukan' });
        const backup = rows[0];
        const filePath = path.join(backupsDir, path.basename(backup.filename || ''));
        if (backup.filename && fs.existsSync(filePath)) {
            await fsp.unlink(filePath);
        }
        await dbQuery('DELETE FROM backups WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (err) {
        console.error('Backup delete error:', err);
        return res.status(500).json({ message: 'Gagal menghapus backup', error: err.message });
    }
});

const toActivityLogInteger = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : null;
};

app.post('/api/activity-logs', async (req, res) => {
    try {
        await ensureActivityLogsTable();
        const body = req.body || {};
        const action = String(body.action === null || body.action === undefined ? '' : body.action).trim();
        const module = String(body.module === null || body.module === undefined ? '' : body.module).trim();
        if (!action || !module) {
            return res.status(400).json({ message: 'Action dan module wajib diisi' });
        }
        const user_id = toActivityLogInteger(body.user_id);
        const role_id = toActivityLogInteger(body.role_id);
        const user_name = String(body.user_name === null || body.user_name === undefined ? '' : body.user_name).trim().slice(0, 150) || 'Unknown';
        const actionValue = action.slice(0, 50);
        const moduleValue = module.slice(0, 100);
        let description = null;
        if (body.description !== null && body.description !== undefined) {
            description = String(body.description).slice(0, 2000);
        }
        const createdAt = new Date();
        const insertResult = await dbQuery(
            'INSERT INTO activity_logs (user_id, user_name, role_id, action, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, user_name, role_id, actionValue, moduleValue, description, createdAt]
        );
        return res.status(201).json({
            id: insertResult.insertId,
            user_id,
            user_name,
            role_id,
            action: actionValue,
            module: moduleValue,
            description,
            created_at: createdAt.toISOString()
        });
    } catch (err) {
        console.error('Activity log create error:', err);
        return res.status(500).json({ message: 'Gagal menyimpan log aktivitas', error: err.message });
    }
});

app.get('/api/activity-logs/active-users', async (req, res) => {
    try {
        await ensureActivityLogsTable();
        const period = String(req.query.period || 'month');
        let interval = '30 DAY';
        if (period === 'week') interval = '7 DAY';
        if (period === 'year') interval = '365 DAY';
        const rows = await dbQuery(`SELECT user_name, COUNT(*) AS total FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${interval}) GROUP BY user_name ORDER BY total DESC LIMIT 10`);
        return res.json(rows.map((row) => ({ name: row.user_name, count: Number(row.total) })));
    } catch (err) {
        console.error('Active users chart error:', err);
        return res.status(500).json({ message: 'Gagal mengambil data user aktif', error: err.message });
    }
});

app.get('/api/activity-logs', async (req, res) => {
    try {
        await ensureActivityLogsTable();
        const conditions = [];
        const params = [];
        const search = String(req.query.search === null || req.query.search === undefined ? '' : req.query.search).trim();
        const action = String(req.query.action === null || req.query.action === undefined ? '' : req.query.action).trim();
        const module = String(req.query.module === null || req.query.module === undefined ? '' : req.query.module).trim();
        if (action) {
            conditions.push('action = ?');
            params.push(action);
        }
        if (module) {
            conditions.push('module = ?');
            params.push(module);
        }
        if (search) {
            const pattern = `%${search}%`;
            conditions.push('(user_name LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ?)');
            params.push(pattern, pattern, pattern, pattern);
        }
        const parsedLimit = Number.parseInt(req.query.limit, 10);
        const parsedOffset = Number.parseInt(req.query.offset, 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 0), 500) : 100;
        const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = await dbQuery(
            `SELECT id, user_id, user_name, role_id, action, module, description, created_at FROM activity_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return res.json(rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            user_name: row.user_name,
            role_id: row.role_id,
            action: row.action,
            module: row.module,
            description: row.description,
            created_at: formatBackupDate(row.created_at)
        })));
    } catch (err) {
        console.error('Activity log list error:', err);
        return res.status(500).json({ message: 'Gagal mengambil log aktivitas', error: err.message });
    }
});

app.delete('/api/activity-logs', async (req, res) => {
    try {
        await ensureActivityLogsTable();
        const body = req.body || {};
        const rawId = req.query.id !== undefined ? req.query.id : body.id;
        const id = Number(rawId);
        if (rawId !== null && rawId !== undefined && rawId !== '' && Number.isInteger(id) && id > 0) {
            await dbQuery('DELETE FROM activity_logs WHERE id = ?', [id]);
        } else {
            await dbQuery('DELETE FROM activity_logs');
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('Activity log delete error:', err);
        return res.status(500).json({ message: 'Gagal menghapus log aktivitas', error: err.message });
    }
});

const formatQrRow = (row) => ({
    ...row,
    created_at: formatBackupDate(row.created_at),
    updated_at: formatBackupDate(row.updated_at),
    deleted_at: formatBackupDate(row.deleted_at)
});

const parseQrUser = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeQrInput = (body, existing = null) => {
    const rawText = body.qr_text !== undefined ? String(body.qr_text).trim() : '';
    const qrText = rawText !== '' ? rawText : (existing ? String(existing.qr_text) : '');
    const rawTitle = body.title !== undefined ? String(body.title).trim() : '';
    const title = rawTitle !== '' ? rawTitle : qrText.slice(0, 100);
    const parsedSize = Number.parseInt(body.size, 10);
    const size = Number.isFinite(parsedSize) ? Math.min(512, Math.max(200, parsedSize)) : (existing ? Number(existing.size) : 320);
    const requestedLevel = body.level !== undefined ? String(body.level) : '';
    const level = ['L', 'M', 'Q', 'H'].includes(requestedLevel) ? requestedLevel : (existing ? String(existing.level) : 'M');
    return { qrText, title, size, level };
};

app.get('/api/qr-codes', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM qr_codes WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC');
        return res.json(rows.map(formatQrRow));
    } catch (err) {
        console.error('QR code list error:', err);
        return res.status(500).json({ message: 'Gagal memuat data QR', error: err.message });
    }
});

app.post('/api/qr-codes', upload.single('image'), async (req, res) => {
    const body = req.body || {};
    const { qrText, title, size, level } = normalizeQrInput(body);
    if (!qrText) return res.status(400).json({ message: 'Teks QR wajib diisi' });
    const image = req.file ? req.file.filename : null;
    const user = parseQrUser(body.created_by);
    const now = new Date();
    try {
        const result = await dbQuery(
            'INSERT INTO qr_codes (title, qr_text, image, size, level, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, qrText, image, size, level, user, user, now, now]
        );
        const id = result.insertId;
        await dbQuery(
            'INSERT INTO qr_code_histories (qr_code_id, action, title, qr_text, image, size, level, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, 'create', title, qrText, image, size, level, user, now]
        );
        const rows = await dbQuery('SELECT * FROM qr_codes WHERE id = ?', [id]);
        return res.status(201).json({ message: 'QR code berhasil disimpan', id, data: formatQrRow(rows[0]) });
    } catch (err) {
        console.error('QR code create error:', err);
        return res.status(500).json({ message: 'Gagal menyimpan QR code', error: err.message });
    }
});

app.get('/api/qr-codes/:id/history', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM qr_code_histories WHERE qr_code_id = ? ORDER BY changed_at DESC, id DESC', [req.params.id]);
        return res.json(rows.map((row) => ({ ...row, changed_at: formatBackupDate(row.changed_at) })));
    } catch (err) {
        console.error('QR code history error:', err);
        return res.status(500).json({ message: 'Gagal memuat riwayat QR', error: err.message });
    }
});

app.put('/api/qr-codes/:id', upload.single('image'), async (req, res) => {
    const body = req.body || {};
    try {
        const rows = await dbQuery('SELECT * FROM qr_codes WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        const existing = rows[0];
        if (!existing) return res.status(404).json({ message: 'QR code tidak ditemukan' });
        const { qrText, title, size, level } = normalizeQrInput(body, existing);
        if (!qrText) return res.status(400).json({ message: 'Teks QR wajib diisi' });
        let image = existing.image;
        if (req.file) image = req.file.filename;
        else if (body.remove_image === '1' || body.remove_image === true) image = null;
        const user = parseQrUser(body.updated_by);
        const now = new Date();
        await dbQuery(
            'INSERT INTO qr_code_histories (qr_code_id, action, title, qr_text, image, size, level, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [existing.id, 'update', existing.title, existing.qr_text, existing.image, existing.size, existing.level, user, now]
        );
        await dbQuery(
            'UPDATE qr_codes SET title = ?, qr_text = ?, image = ?, size = ?, level = ?, updated_by = ?, updated_at = ? WHERE id = ?',
            [title, qrText, image, size, level, user, now, existing.id]
        );
        const savedRows = await dbQuery('SELECT * FROM qr_codes WHERE id = ?', [existing.id]);
        return res.json({ message: 'QR code berhasil diperbarui', data: formatQrRow(savedRows[0]) });
    } catch (err) {
        console.error('QR code update error:', err);
        return res.status(500).json({ message: 'Gagal memperbarui QR code', error: err.message });
    }
});

app.delete('/api/qr-codes/:id', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM qr_codes WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        const existing = rows[0];
        if (!existing) return res.status(404).json({ message: 'QR code tidak ditemukan' });
        const user = parseQrUser((req.body || {}).updated_by);
        const now = new Date();
        await dbQuery(
            'INSERT INTO qr_code_histories (qr_code_id, action, title, qr_text, image, size, level, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [existing.id, 'delete', existing.title, existing.qr_text, existing.image, existing.size, existing.level, user, now]
        );
        await dbQuery('UPDATE qr_codes SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?', [now, user, now, existing.id]);
        return res.json({ message: 'QR code berhasil dihapus' });
    } catch (err) {
        console.error('QR code delete error:', err);
        return res.status(500).json({ message: 'Gagal menghapus QR code', error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});