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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    fetch(ROLE_URL)
      .then(res => res.json())
      .then(data => {
        const roleData = Array.isArray(data) ? data : [];
        setRoles(roleData);
      })
      .catch(() => showNotification("Gagal memuat list role", "error"));
  }, []);

  useEffect(() => {
    if (!selectedRoleId) {
      setMatrix([]);
      return;
    }
    setLoading(true);
    fetch(`${AUTH_MATRIX_URL}/${selectedRoleId}`)
      .then(res => res.json())
      .then(data => {
        setMatrix(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        showNotification("Gagal memuat matriks hak akses", "error");
        setLoading(false);
      });
  }, [selectedRoleId]);

  // FIX: Mengubah status per-kolom + Auto Ceklis Induk jika Anak Aktif
  const handleCheckboxChange = (menuId, accessType) => {
    const updateTree = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        let currentAccess = { ...(item.access || {}) };
        let currentSubs = item.subs ? [...item.subs] : [];

        if (String(item.menu_id) === String(menuId)) {
          // Jika ini node target yang diklik
          const nextVal = String(currentAccess[accessType]) === '1' ? '0' : '1';
          currentAccess[accessType] = nextVal;
        } else if (currentSubs.length > 0) {
          // Jika bukan, telusuri anak-anaknya terlebih dahulu
          currentSubs = updateTree(currentSubs);
          
          // EVALUASI PASCA-ANAK: Jika ada minimal 1 anak yang bernilai '1', induk dipaksa ikutan '1'
          const isAnyChildActive = currentSubs.some(sub => String(sub.access?.[accessType]) === '1');
          if (isAnyChildActive) {
            currentAccess[accessType] = '1';
          }
        }

        return { ...item, access: currentAccess, subs: currentSubs };
      });
    };
    setMatrix(prev => updateTree(prev));
  };

  // FIX: Mengubah status master baris + Auto Ceklis Induk jika Anak Aktif
  const handleRowMasterChange = (menuId, checked) => {
    const targetVal = checked ? '1' : '0';
    const updateTree = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        let currentAccess = { ...(item.access || {}) };
        let currentSubs = item.subs ? [...item.subs] : [];

        if (String(item.menu_id) === String(menuId)) {
          // Centang seluruh kolom pada baris target
          accessColumns.forEach(col => {
            currentAccess[col.key] = targetVal;
          });
        } else if (currentSubs.length > 0) {
          currentSubs = updateTree(currentSubs);
          
          // EVALUASI PASCA-ANAK: Periksa semua tipe akses kolom demi kolom
          accessColumns.forEach(col => {
            const isAnyChildActive = currentSubs.some(sub => String(sub.access?.[col.key]) === '1');
            if (isAnyChildActive) {
              currentAccess[col.key] = '1';
            }
          });
        }

        return { ...item, access: currentAccess, subs: currentSubs };
      });
    };
    setMatrix(prev => updateTree(prev));
  };

  const handleGlobalAllChange = (checked) => {
    const targetVal = checked ? '1' : '0';
    const updateAllNodes = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const newAccess = { ...(item.access || {}) };
        accessColumns.forEach(col => {
          newAccess[col.key] = targetVal;
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
        const isRowAllChecked = accessColumns.every(col => String(nodeAccess[col.key]) === '1');
        if (!isRowAllChecked) {
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

      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const RenderRow = ({ item, depth = 0 }) => {
    if (!item) return null;
    
    const isChild = depth > 0;
    const itemAccess = item.access || {};
    const isRowAllChecked = accessColumns.every(col => String(itemAccess[col.key]) === '1');

    return (
      <>
        <tr className={`border-b border-gray-200/70 hover:bg-indigo-50/40 transition-colors ${isChild ? 'bg-gray-50/80' : 'bg-white'}`}>
          <td className="py-3 px-6 font-medium text-sm text-gray-800" style={{ paddingLeft: `${(depth * 1.75) + 1.5}rem` }}>
            <div className="flex items-center gap-2">
              {isChild && (
                <span className="text-gray-400 font-mono select-none mr-1">└─</span>
              )}
              <input 
                type="checkbox"
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                checked={isRowAllChecked}
                onChange={(e) => handleRowMasterChange(item.menu_id, e.target.checked)}
              />
              <span className={`${isChild ? 'text-gray-600 font-normal' : 'font-bold text-gray-900 tracking-wide'}`}>
                {item.title}
              </span>
            </div>
          </td>

          {accessColumns.map(col => (
            <td key={col.key} className="py-3 px-2 text-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                checked={String(itemAccess[col.key]) === '1'} 
                onChange={() => handleCheckboxChange(item.menu_id, col.key)}
              />
            </td>
          ))}
        </tr>

        {item.subs && Array.isArray(item.subs) && item.subs.map(sub => (
          <RenderRow key={sub.menu_id} item={sub} depth={depth + 1} />
        ))}
      </>
    );
  };

  const isGlobalAllChecked = checkIsGlobalAllChecked(matrix);

  return (
    <div className="max-w-7xl mx-auto p-4 relative">
      {notification.show && (
        <div className="fixed top-6 right-20 z-[60] px-6 py-4 rounded-xl shadow-xl border-l-4 bg-white border-green-500 text-gray-800">
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* SEARCH / FILTER ROLE */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6 flex items-center gap-6">
        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Pencarian</label>
        <select 
          className="w-full max-w-xs border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-indigo-500 transition"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
        >
          <option value="">-- Pilih Role --</option>
          {roles.map(role => (
            <option key={role.role_id} value={role.role_id}>{role.name_role || role.role_name}</option>
          ))}
        </select>
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
  );
};

export default ModuleAuthority;