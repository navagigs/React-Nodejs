const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const bodyParser = require('body-parser');
const multer = require('multer'); // <-- 1. Import Multer
const path = require('path');
const fs = require('fs'); // Untuk menghapus file

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
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',       // Sesuaikan jika ada password
    database: 'admin_react' // Pastikan nama DB benar
});

// Cek Koneksi Database
db.connect((err) => {
    if (err) {
        console.error("❌ Database Error:", err.message);
    } else {
        console.log("✅ Database Terhubung!");
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

            // =========================================================================
            // FIX: Tarik data Hak Akses (Permissions) dari tabel module_authority
            // Kita hanya mengambil menu yang status 'is_view'-nya aktif ('1')
            // =========================================================================
            const sqlAuth = `
                SELECT menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock 
                FROM module_authority 
                WHERE role_id = ? AND is_view = '1'
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
                    permissions,           // Berisi array list hak akses yang bernilai string '1'
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

app.get('/api/menus/access/:role_id', (req, res) => {
    const roleId = req.params.role_id;

    if (!roleId) {
        return res.status(400).json({ message: "Role ID tidak ditemukan" });
    }

    // Kueri SQL: Hanya mengambil menu yang memiliki izin 'is_view' = '1' untuk role_id ini
    const sql = `
        SELECT m.* FROM menu m
        INNER JOIN module_authority ma ON m.menu_id = ma.menu_id
        WHERE ma.role_id = ? AND ma.is_view = '1'
        ORDER BY m.menu_order ASC
    `;
    
    db.query(sql, [roleId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const parents = [];
        const children = [];

        // Kelompokkan data flat dari DB ke susunan berundak (Tree)
        result.forEach(item => {
            if (item.menu_id === 1 || item.parent_id === 1 || !item.parent_id) {
                parents.push({ ...item, subs: [] });
            } else {
                children.push(item);
            }
        });

        children.forEach(child => {
            const parent = parents.find(p => p.menu_id === child.parent_id);
            if (parent) {
                parent.subs.push(child);
            } else {
                parents.push({ ...child, subs: [] });
            }
        });

        parents.sort((a, b) => a.menu_order - b.menu_order);

        return res.json(parents);
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
        title, description, client_id,
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date 
    } = req.body;
    
    const imageFilename = req.file ? req.file.filename : null; 

    // Query diupdate sesuai dengan susunan kolom baru di database
    const sql = `INSERT INTO portfolio (
        title, description, client_id, image, 
        portfolio_value, project_name, contract_number, 
        contract_year, contract_start_date, contract_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // Pastikan urutan array params ini sama persis dengan urutan kolom di atas!
    const params = [
        title, description, client_id, imageFilename,
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
        title, client_id, description,
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
            title=?, client_id=?, description=?, image=?, 
            portfolio_value=?, project_name=?, contract_number=?, 
            contract_year=?, contract_start_date=?, contract_end_date=? 
            WHERE id=?`;
        
        params = [
            title, client_id, description, req.file.filename, 
            portfolio_value, project_name, contract_number, 
            contract_year, contract_start_date, contract_end_date, 
            id
        ];
    } else {
        // Update data teks SAJA (gambar lama tetap aman)
        sql = `UPDATE portfolio SET 
            title=?, client_id=?, description=?, 
            portfolio_value=?, project_name=?, contract_number=?, 
            contract_year=?, contract_start_date=?, contract_end_date=? 
            WHERE id=?`;
        
        params = [
            title, client_id, description, 
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
// API BERITA (NEWS)
// ==========================================

// GET News (Join dengan Category)
app.get('/api/news', (req, res) => {
    const sql = `
        SELECT news.*, categories.name as category_name 
        FROM news 
        LEFT JOIN categories ON news.category_id = categories.id 
        ORDER BY news.created_at DESC
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// POST News
app.post('/api/news', upload.single('image'), (req, res) => {
    const { title, content, category_id } = req.body;
    const image = req.file ? req.file.filename : null;
    
    const sql = "INSERT INTO news (title, content, category_id, image) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, content, category_id, image], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "News created", id: result.insertId });
    });
});

app.post('/api/news/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { title, content, category_id } = req.body;
    const newImage = req.file ? req.file.filename : null;

    db.query("SELECT image FROM news WHERE id=?", [id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0) return res.status(404).json({ message: 'News not found' });

        const oldImage = rows[0].image;

        let sql, params;
        if (newImage) {
            sql = "UPDATE news SET title=?, content=?, category_id=?, image=? WHERE id=?";
            params = [title, content, category_id, newImage, id];
        } else {
            sql = "UPDATE news SET title=?, content=?, category_id=? WHERE id=?";
            params = [title, content, category_id, id];
        }

        db.query(sql, params, (err) => {
            if (err) return res.status(500).json(err);

            // Hapus gambar lama SETELAH update sukses
            if (newImage && oldImage) {
                const oldPath = path.join(__dirname, 'uploads', oldImage);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            res.json({ message: 'News updated successfully' });
        });
    });
});



// DELETE News
app.delete('/api/news/:id', (req, res) => {
    const id = req.params.id;
    db.query("SELECT image FROM news WHERE id=?", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        
        // Hapus data DB
        db.query("DELETE FROM news WHERE id=?", [id], (err) => {
            if (err) return res.status(500).json(err);
            
            // Hapus File
            if (results.length > 0 && results[0].image) {
                const filePath = path.join(__dirname, 'uploads', results[0].image);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            res.json({ message: "News deleted" });
        });
    });
});

// ==========================================
//          API LOGIC FOR LETTERS (FIXED)
// ==========================================

// 5. GET: Hitung total surat untuk keperluan nomor urut otomatis
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
        parent_id, title, url, description, menu_order, type,
        is_view, is_create, is_edit, is_delete, is_export, 
        is_duplicate, is_unlock, is_active, class_active, icon
    } = req.body;

    const query = `
        INSERT INTO menu 
        (parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        parent_id || null, title, url || null, description || null, menu_order || 0, type || null,
        is_view || 'N', is_create || 'N', is_edit || 'N', is_delete || 'N', is_export || 'N',
        is_duplicate || 'N', is_unlock || 'N', is_active || 1, class_active || null, icon || null
    ];

    db.query(query, values, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu berhasil ditambahkan', menu_id: results.insertId });
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
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status
    } = req.body;

    const sql = `INSERT INTO project_documents (
        project_id, location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        project_id, location,
        inspection_date ? inspection_date.split('T')[0] : null, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date ? progress_date.split('T')[0] : null, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date ? handover_date.split('T')[0] : null, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status
    ];

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json({ message: "Success", id: result.insertId });
    });
});

// 4. PUT (Update Data Dokumen Berdasarkan ID)
app.put('/api/project-documents/:id', (req, res) => {
    const {
        location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status
    } = req.body;
    const id = req.params.id;

    const sql = `UPDATE project_documents SET 
        location=?, 
        inspection_date=?, inspection_officer_name_1=?, inspection_officer_role_1=?, inspection_officer_name_2=?, inspection_officer_role_2=?, inspection_description=?,
        progress_date=?, progress_officer_name_1=?, progress_officer_role_1=?, progress_officer_name_2=?, progress_officer_role_2=?, progress_description=?,
        handover_date=?, handover_officer_name_1=?, handover_officer_role_1=?, handover_officer_name_2=?, handover_officer_role_2=?, handover_description=?, company_1=?, company_2=?, progress_status=?, handover_status=? 
        WHERE id=?`;

    const params = [
        location,
        inspection_date ? inspection_date.split('T')[0] : null, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date ? progress_date.split('T')[0] : null, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date ? handover_date.split('T')[0] : null, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status,
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
        SELECT u.id, u.email, u.name, u.role_id, r.name_role 
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
    const { email, password, name, role_id } = req.body;

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

        const sql = "INSERT INTO users (email, password, name, role_id) VALUES (?, ?, ?, ?)";
        const values = [email, hashedPassword, name, cleanRoleId];

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
    const { email, password, name, role_id } = req.body;

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
        if (password && password.trim() !== "") {
            // PERBAIKAN 2: Gunakan saltRounds 10 secara langsung untuk menghindari 'saltRounds is not defined'
            const hashedPassword = await bcrypt.hash(password, 10);
            
            sql = "UPDATE users SET email = ?, password = ?, name = ?, role_id = ? WHERE id = ?";
            values = [email, hashedPassword, name, cleanRoleId, userId];
        } else {
            // Jika password kosong, update field lainnya tanpa mengubah password lama di database
            sql = "UPDATE users SET email = ?, name = ?, role_id = ? WHERE id = ?";
            values = [email, name, cleanRoleId, userId];
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
 
  // =========================================================================
// 1. GET DATA MATRIKS (MURNI STRING '1' DAN '0')
// =========================================================================

// =========================================================================
// 1. GET DATA MATRIKS (STRUKTUR SINKRON DENGAN LOGIKA /api/menus)
// =========================================================================
app.get('/api/module-authority/:role_id', (req, res) => {
    const roleId = req.params.role_id;

    // Ambil data menu urut berdasarkan menu_order (Sama seperti /api/menus)
    const sqlMenu = "SELECT menu_id, title, parent_id, menu_order FROM menu ORDER BY menu_order ASC";
    
    db.query(sqlMenu, (errMenu, menus) => {
        if (errMenu) return res.status(500).json({ error: errMenu.message });

        // Ambil data authority
        const sqlAuth = "SELECT * FROM module_authority WHERE role_id = ?";
        db.query(sqlAuth, [roleId], (errAuth, authorities) => {
            if (errAuth) return res.status(500).json({ error: errAuth.message });

            // Ikat hak akses berdasarkan menu_id ke dalam Map (Key-Value)
            const authMap = {};
            authorities.forEach(auth => {
                authMap[String(auth.menu_id)] = {
                    is_view: String(auth.is_view) === '1' ? '1' : '0',
                    is_create: String(auth.is_create) === '1' ? '1' : '0',
                    is_edit: String(auth.is_edit) === '1' ? '1' : '0',
                    is_delete: String(auth.is_delete) === '1' ? '1' : '0',
                    is_export: String(auth.is_export) === '1' ? '1' : '0',
                    is_duplicate: String(auth.is_duplicate) === '1' ? '1' : '0',
                    is_unlock: String(auth.is_unlock) === '1' ? '1' : '0'
                };
            });

            // Satukan struktur menu dengan hak aksesnya (Flat Data)
            const matrixData = menus.map(menu => {
                const idString = String(menu.menu_id);
                return {
                    menu_id: menu.menu_id,
                    title: menu.title,
                    parent_id: menu.parent_id,
                    menu_order: menu.menu_order,
                    access: authMap[idString] || {
                        is_view: '0', is_create: '0', is_edit: '0', is_delete: '0', is_export: '0', is_duplicate: '0', is_unlock: '0'
                    }
                };
            });

            // =========================================================================
            // ADAPTASI LOGIKA UTAMA: Memisahkan Parent & Child Persis Seperti /api/menus
            // =========================================================================
            const parents = [];
            const children = [];

            matrixData.forEach(item => {
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
                    parent.subs.push(child);
                } else {
                    parents.push({ ...child, subs: [] });
                }
            });

            // Urutkan kembali parent berdasarkan menu_order asli database
            parents.sort((a, b) => a.menu_order - b.menu_order);

            // Kirim hasilnya ke React Frontend
            return res.json(parents);
        });
    });
});

// =========================================================================
// 2. POST SAVE (MURNI STRING '1' DAN '0')
// =========================================================================
app.post('/api/module-authority/save', (req, res) => {
    const { role_id, permissions } = req.body;

    if (!role_id) return res.status(400).json({ error: "Role ID wajib dipilih!" });

    const deleteSql = "DELETE FROM module_authority WHERE role_id = ?";
    db.query(deleteSql, [role_id], (delErr) => {
        if (delErr) return res.status(500).json({ error: delErr.message });

        if (!permissions || permissions.length === 0) {
            return res.json({ message: "Data dibersihkan" });
        }

        const insertSql = `
            INSERT INTO module_authority 
            (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock) 
            VALUES ?
        `;

        const values = permissions.map(p => [
            role_id,
            p.menu_id,
            String(p.is_view) === '1' ? '1' : '0',
            String(p.is_create) === '1' ? '1' : '0',
            String(p.is_edit) === '1' ? '1' : '0',
            String(p.is_delete) === '1' ? '1' : '0',
            String(p.is_export) === '1' ? '1' : '0',
            String(p.is_duplicate) === '1' ? '1' : '0',
            String(p.is_unlock) === '1' ? '1' : '0'
        ]);

        db.query(insertSql, [values], (insErr, result) => {
            if (insErr) return res.status(500).json({ error: insErr.message });
            res.json({ message: "Hak akses berhasil disimpan!" });
        });
    });
});


app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});