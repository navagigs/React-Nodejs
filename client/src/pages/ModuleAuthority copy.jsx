import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { ROLE_URL, AUTH_MATRIX_URL } from '../Api';

const ModuleAuthority = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const accessColumns = [
    { key: 'is_view', label: 'View' },
    { key: 'is_create', label: 'Create' },
    { key: 'is_edit', label: 'Edit' },
    { key: 'is_delete', label: 'Delete' },
    { key: 'is_export', label: 'Export' },
    { key: 'is_duplicate', label: 'Duplicate' },
    { key: 'is_unlock', label: 'Unlock' },
  ];

  // Helper untuk mengecek apakah sebuah kolom aktif (bernilai '1') di master tabel menu
  // Helper Baru: Pendeteksi otomatis tipe data & penamaan dari backend
  const isColumnEnabledInMenu = (item, colKey) => {
    // 1. Cek jika data dibungkus dalam objek 'menu_config' oleh backend
    if (item.menu_config && item.menu_config[colKey] !== undefined) {
      return String(item.menu_config[colKey]).trim() === '1';
    }
    
    // 2. Cek jika database menggunakan alias prefix 'menu_is_view', 'menu_is_create', dll.
    if (item[`menu_${colKey}`] !== undefined) {
      return String(item[`menu_${colKey}`]).trim() === '1';
    }
    
    // 3. Cek jika data berada langsung di root level item ('item.is_view', 'item.is_create')
    if (item[colKey] !== undefined) {
      return String(item[colKey]).trim() === '1';
    }

    // Fallback: Jika field tidak ditemukan sama sekali di object menu, 
    // munculkan checkbox agar halaman tidak kosong (true)
    return true; 
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    fetch(ROLE_URL)
      .then(res => res.json())
      .then(data => {
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch(() => showNotification("Gagal memuat list role", "error"));
  }, []);

useEffect(() => {
    if (!selectedRoleId) return;
    fetch(`${AUTH_MATRIX_URL}/${selectedRoleId}`)
      .then(res => res.json())
      .then(data => {
        // LIHAT STRUKTUR DATA ASLI DARI BACKEND ANDA DI SINI
        console.log("CONTOH DATA DARI BACKEND:", data[0]); 
        setMatrix(Array.isArray(data) ? data : []);
      });
  }, [selectedRoleId]);
  // Perubahan per-checkbox individu
   // Perubahan per-checkbox individu (Induk mengubah anak, Anak mengevaluasi induk)
  const handleCheckboxChange = (menuId, accessType) => {
    // Fungsi pembantu untuk mengubah status seluruh sub-menu di bawah target secara massal
    const cascadeToChildren = (subs, targetVal) => {
      if (!Array.isArray(subs)) return [];
      return subs.map(sub => {
        let subAccess = { ...(sub.access || {}) };
        // Hanya ubah jika kolom tersebut diizinkan aktif di tabel menu
        if (isColumnEnabledInMenu(sub, accessType)) {
          subAccess[accessType] = targetVal;
        }
        return {
          ...sub,
          access: subAccess,
          subs: cascadeToChildren(sub.subs, targetVal)
        };
      });
    };

    const updateTree = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        let currentAccess = { ...(item.access || {}) };
        let currentSubs = item.subs ? [...item.subs] : [];

        // KONDISI 1: Jika baris ini adalah menu INDUK/TARGET yang diklik
        if (String(item.menu_id) === String(menuId)) {
          if (isColumnEnabledInMenu(item, accessType)) {
            const nextVal = String(currentAccess[accessType]) === '1' ? '0' : '1';
            currentAccess[accessType] = nextVal;
            
            // OPER KE BAWAH: Semua anak di bawahnya otomatis mengikuti nilai induk yang baru
            if (currentSubs.length > 0) {
              currentSubs = cascadeToChildren(currentSubs, nextVal);
            }
          }
        } 
        // KONDISI 2: Jika bukan target, telusuri ke dalam anak-anaknya (Rekursif)
        else if (currentSubs.length > 0) {
          currentSubs = updateTree(currentSubs);
          
          // EVALUASI KE ATAS: Induk otomatis ikut aktif jika minimal ada 1 anak yang aktif
          const isAnyChildActive = currentSubs.some(sub => String(sub.access?.[accessType]) === '1');
          if (isAnyChildActive && isColumnEnabledInMenu(item, accessType)) {
            currentAccess[accessType] = '1';
          } else if (!isAnyChildActive && isColumnEnabledInMenu(item, accessType)) {
            // Jika semua anak sudah mati (uncheck), matikan juga induknya
            currentAccess[accessType] = '0';
          }
        }

        return { ...item, access: currentAccess, subs: currentSubs };
      });
    };
    setMatrix(prev => updateTree(prev));
  };

  // Perubahan Master Baris (Mencentang semua kolom yang AKTIF pada satu baris menu)
   // Perubahan Master Baris (Induk mengubah kolom & sub-menu di bawahnya)
  const handleRowMasterChange = (menuId, checked) => {
    const targetVal = checked ? '1' : '0';

    // Fungsi pembantu untuk menurunkan status master baris ke tingkat anak
    const cascadeRowToChildren = (subs, val) => {
      if (!Array.isArray(subs)) return [];
      return subs.map(sub => {
        let subAccess = { ...(sub.access || {}) };
        accessColumns.forEach(col => {
          if (isColumnEnabledInMenu(sub, col.key)) {
            subAccess[col.key] = val;
          } else {
            subAccess[col.key] = '0';
          }
        });
        return {
          ...sub,
          access: subAccess,
          subs: cascadeRowToChildren(sub.subs, val)
        };
      });
    };

    const updateTree = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        let currentAccess = { ...(item.access || {}) };
        let currentSubs = item.subs ? [...item.subs] : [];

        if (String(item.menu_id) === String(menuId)) {
          // Ubah semua kolom aktif di baris induk
          accessColumns.forEach(col => {
            if (isColumnEnabledInMenu(item, col.key)) {
              currentAccess[col.key] = targetVal;
            } else {
              currentAccess[col.key] = '0';
            }
          });

          // OPER KE BAWAH: Semua anak ikut terpengaruh check/uncheck baris induk
          if (currentSubs.length > 0) {
            currentSubs = cascadeRowToChildren(currentSubs, targetVal);
          }
        } else if (currentSubs.length > 0) {
          currentSubs = updateTree(currentSubs);
          
          // Evaluasi balik status baris induk berdasarkan kondisi anak
          accessColumns.forEach(col => {
            const isAnyChildActive = currentSubs.some(sub => String(sub.access?.[col.key]) === '1');
            if (isAnyChildActive && isColumnEnabledInMenu(item, col.key)) {
              currentAccess[col.key] = '1';
            } else if (!isAnyChildActive && isColumnEnabledInMenu(item, col.key)) {
              currentAccess[col.key] = '0';
            }
          });
        }

        return { ...item, access: currentAccess, subs: currentSubs };
      });
    };
    setMatrix(prev => updateTree(prev));
  };

  // Perubahan Master Global (Pojok Kiri Atas tabel)
  const handleGlobalAllChange = (checked) => {
    const targetVal = checked ? '1' : '0';
    const updateAllNodes = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const newAccess = { ...(item.access || {}) };
        
        accessColumns.forEach(col => {
          if (isColumnEnabledInMenu(item, col.key)) {
            newAccess[col.key] = targetVal;
          } else {
            newAccess[col.key] = '0';
          }
        });
        
        if (item.subs && item.subs.length > 0) {
          return { ...item, access: newAccess, subs: updateAllNodes(item.subs) };
        }
        return { ...item, access: newAccess };
      });
    };
    setMatrix(prev => updateAllNodes(prev));
  };

  const checkIsGlobalAllChecked = (items) => {
    if (!Array.isArray(items) || items.length === 0) return false;
    
    let allChecked = true;
    const traverse = (nodes) => {
      for (const node of nodes) {
        const nodeAccess = node.access || {};
        // Cari kolom yang aktif saja pada menu ini
        const enabledCols = accessColumns.filter(col => isColumnEnabledInMenu(node, col.key));
        
        const isRowAllChecked = enabledCols.length > 0 && enabledCols.every(col => String(nodeAccess[col.key]) === '1');
        if (enabledCols.length > 0 && !isRowAllChecked) {
          allChecked = false;
          return;
        }
        if (node.subs && node.subs.length > 0) {
          traverse(node.subs);
        }
      }
    };
    
    traverse(items);
    return allChecked;
  };

  const flattenMatrix = (items) => {
    if (!Array.isArray(items)) return [];
    let result = [];
    items.forEach(item => {
      const accessData = item.access || {
        is_view: '0', is_create: '0', is_edit: '0', is_delete: '0', is_export: '0', is_duplicate: '0', is_unlock: '0'
      };
      result.push({ menu_id: item.menu_id, ...accessData });
      if (item.subs && item.subs.length > 0) {
        result = [...result, ...flattenMatrix(item.subs)];
      }
    });
    return result;
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    const payload = {
      role_id: parseInt(selectedRoleId, 10),
      permissions: flattenMatrix(matrix)
    };

    try {
      const response = await fetch(`${AUTH_MATRIX_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Gagal menyimpan data");
      
      showNotification("Hak akses berhasil diperbarui!", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const RenderRow = ({ item, depth = 0 }) => {
    if (!item) return null;
    
    const isChild = depth > 0;
    const itemAccess = item.access || {};

    // Ambil kolom yang aktif khusus untuk master checkbox baris saat ini
    const enabledColumns = accessColumns.filter(col => isColumnEnabledInMenu(item, col.key));
    const isRowAllChecked = enabledColumns.length > 0 && enabledColumns.every(col => String(itemAccess[col.key]).trim() === '1');

    return (
      <>
        <tr className={`border-b border-gray-200/70 hover:bg-indigo-50/40 transition-colors ${isChild ? 'bg-gray-50/80' : 'bg-white'}`}>
          <td className="py-3 px-6 font-medium text-sm text-gray-800" style={{ paddingLeft: `${(depth * 1.75) + 1.5}rem` }}>
            <div className="flex items-center gap-2">
              {isChild && (
                <span className="text-gray-400 font-mono select-none mr-1">└─</span>
              )}
              
              {/* Checkbox Master Baris Utama */}
              {enabledColumns.length > 0 ? (
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  checked={isRowAllChecked}
                  onChange={(e) => handleRowMasterChange(item.menu_id, e.target.checked)}
                />
              ) : (
                <div className="w-4 h-4"></div>
              )}

              <span className={`${isChild ? 'text-gray-600 font-normal' : 'font-bold text-gray-900 tracking-wide'}`}>
                {item.title}
              </span>
            </div>
          </td>

          {/* Render Kolom Akses Berdasarkan Nilai 1 dari Master Menu */}
          {accessColumns.map(col => {
            const hasColumnAccess = isColumnEnabledInMenu(item, col.key);

            if (hasColumnAccess) {
              return (
                <td key={col.key} className="py-3 px-2 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    checked={String(itemAccess[col.key]).trim() === '1'} 
                    onChange={() => handleCheckboxChange(item.menu_id, col.key)}
                  />
                </td>
              );
            }

            // Jika bernilai '0', kembalikan kolom kosong biar putih bersih sesuai gambar screenshot
            return (
              <td key={col.key} className="py-3 px-2 text-center bg-transparent"></td>
            );
          })}
        </tr>

        {item.subs && Array.isArray(item.subs) && item.subs.map(sub => (
          <RenderRow key={sub.menu_id} item={sub} depth={depth + 1} />
        ))}
      </>
    );
  };

  const isGlobalAllChecked = checkIsGlobalAllChecked(matrix);

  const currentMenuData = matrix.find(item => 
    item.title?.toLowerCase().includes("authority") || 
    item.title?.toLowerCase().includes("hak akses")
  );

  const headerTitle = currentMenuData ? currentMenuData.title : "Module Authority";
  const headerDescription = currentMenuData?.description 
    ? currentMenuData.description 
    : "Kelola data peran pengguna aplikasi beserta matriks hak akses menunya.";

  return (    
    <>
      {notification.show && (
        <div className="fixed top-6 right-20 z-[60] px-6 py-4 rounded-xl shadow-xl border-l-4 bg-white border-green-500 text-gray-800">
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}
      

      {/* FILTER ROLE */} 
    <div className="max-w-7xl mx-auto"> 
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        {/* 1. HEADER DI DALAM BOKS PUTIH */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{headerTitle}</h2>
            {/* <p className="text-sm text-gray-500 mt-1">{headerDescription}</p> */}
          </div>
        </div>
         
        {/* 2. AREA FILTER PENCARIAN ROLE */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
            Role Akses
          </label>
          <select 
            className="w-full max-w-xs border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-indigo-500 transition cursor-pointer shadow-sm"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
          >
            <option value="">-- Pilih Role --</option>
            {roles.map(role => (
              <option key={role.role_id} value={role.role_id}>
                {role.name_role || role.role_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-[30%]">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      disabled={matrix.length === 0}
                      checked={isGlobalAllChecked}
                      onChange={(e) => handleGlobalAllChange(e.target.checked)}
                    />
                    <span>Nama Menu</span>
                  </div>
                </th>
                {accessColumns.map(col => (
                  <th key={col.key} className="py-4 px-2 text-center w-[10%]">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {!selectedRoleId ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">Silakan pilih Role terlebih dahulu untuk memuat data.</td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 animate-pulse">Memuat matriks hak akses...</td>
                </tr>
              ) : matrix.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">Data tidak ditemukan. Silakan cek database menu Anda.</td>
                </tr>
              ) : (
                matrix.map(item => <RenderRow key={item.menu_id} item={item} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Button Simpan */}
      {selectedRoleId && !loading && (
        <button 
          onClick={handleSave}
          className="fixed right-6 bottom-20 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-lg shadow-lg transition transform hover:-translate-y-0.5 z-50 flex items-center justify-center"
          title="Simpan Hak Akses"
        >
          <Save className="w-5 h-5" />
        </button>
      )}
    </div>  
    </>
  );
};

export default ModuleAuthority;