import React, { useState, useEffect } from 'react';
import { Save, Folder, FolderOpen, ChevronRight, ChevronDown, ShieldAlert, Key } from 'lucide-react';
import { ROLE_URL, AUTH_MATRIX_URL } from '../Api';

const ModuleAuthority = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // State baru untuk menyimpan ID menu mana saja yang sedang terbuka di pohon
  const [expandedIds, setExpandedIds] = useState([]);

  const accessColumns = [
    { key: 'is_view', label: 'View' },
    { key: 'is_create', label: 'Create' },
    { key: 'is_edit', label: 'Edit' },
    { key: 'is_delete', label: 'Delete' },
    { key: 'is_export', label: 'Export' },
    { key: 'is_duplicate', label: 'Duplicate' },
    { key: 'is_unlock', label: 'Unlock' },
  ];

  const isColumnEnabledInMenu = (item, colKey) => {
    if (item.menu_config && item.menu_config[colKey] !== undefined) {
      return String(item.menu_config[colKey]).trim() === '1';
    }
    if (item[`menu_${colKey}`] !== undefined) {
      return String(item[`menu_${colKey}`]).trim() === '1';
    }
    if (item[colKey] !== undefined) {
      return String(item[colKey]).trim() === '1';
    }
    return true; 
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  };

  // Fungsi toggle ekspansi pohon menu
  const toggleExpand = (menuId) => {
    setExpandedIds(prev => 
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
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
    setLoading(true);
    fetch(`${AUTH_MATRIX_URL}/${selectedRoleId}`)
      .then(res => res.json())
      .then(data => {
        setMatrix(Array.isArray(data) ? data : []);
        // Buka semua menu level utama secara default saat pertama kali dimuat
        if (Array.isArray(data)) {
          setExpandedIds(data.map(item => item.menu_id));
        }
        setLoading(false);
      })
      .catch(() => {
        showNotification("Gagal memuat matriks hak akses", "error");
        setLoading(false);
      });
  }, [selectedRoleId]);

  const handleCheckboxChange = (menuId, accessType) => {
    const cascadeToChildren = (subs, targetVal) => {
      if (!Array.isArray(subs)) return [];
      return subs.map(sub => {
        let subAccess = { ...(sub.access || {}) };
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

        if (String(item.menu_id) === String(menuId)) {
          if (isColumnEnabledInMenu(item, accessType)) {
            const nextVal = String(currentAccess[accessType]) === '1' ? '0' : '1';
            currentAccess[accessType] = nextVal;
            
            if (currentSubs.length > 0) {
              currentSubs = cascadeToChildren(currentSubs, nextVal);
            }
          }
        } else if (currentSubs.length > 0) {
          currentSubs = updateTree(currentSubs);
          
          const isAnyChildActive = currentSubs.some(sub => String(sub.access?.[accessType]) === '1');
          if (isAnyChildActive && isColumnEnabledInMenu(item, accessType)) {
            currentAccess[accessType] = '1';
          } else if (!isAnyChildActive && isColumnEnabledInMenu(item, accessType)) {
            currentAccess[accessType] = '0';
          }
        }

        return { ...item, access: currentAccess, subs: currentSubs };
      });
    };
    setMatrix(prev => updateTree(prev));
  };

  const handleRowMasterChange = (menuId, checked) => {
    const targetVal = checked ? '1' : '0';

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
          accessColumns.forEach(col => {
            if (isColumnEnabledInMenu(item, col.key)) {
              currentAccess[col.key] = targetVal;
            } else {
              currentAccess[col.key] = '0';
            }
          });

          if (currentSubs.length > 0) {
            currentSubs = cascadeRowToChildren(currentSubs, targetVal);
          }
        } else if (currentSubs.length > 0) {
          currentSubs = updateTree(currentSubs);
          
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

  // --- KOMPONEN TREE VIEW RENDER ROW REKURSIF ---
  const RenderRow = ({ item, depth = 0 }) => {
    if (!item) return null;
    
    const isChild = depth > 0;
    const hasChildren = item.subs && item.subs.length > 0;
    const isExpanded = expandedIds.includes(item.menu_id);
    const itemAccess = item.access || {};

    const enabledColumns = accessColumns.filter(col => isColumnEnabledInMenu(item, col.key));
    const isRowAllChecked = enabledColumns.length > 0 && enabledColumns.every(col => String(itemAccess[col.key]).trim() === '1');

    return (
      <>
        <tr className={`border-b border-gray-200/60 hover:bg-indigo-50/50 transition-colors ${isChild ? 'bg-slate-50/60' : 'bg-white'}`}>
          <td className="py-3.5 px-6 font-medium text-sm text-gray-800" style={{ paddingLeft: `${(depth * 1.5) + 1.5}rem` }}>
            <div className="flex items-center gap-1.5 relative">
              
              {/* Garis pemandu hierarki (Tree Line Indicator) */}
              {isChild && (
                <span className="text-gray-300 font-light select-none mr-0.5 border-l-2 border-b-2 border-dashed border-gray-300 w-3.5 h-4 -mt-2.5 block flex-shrink-0"></span>
              )}
              
              {/* Tombol Expand/Collapse untuk Induk yang memiliki Sub-Menu */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.menu_id)}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-500 transition-colors mr-1 flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-5 mr-1 flex-shrink-0"></div>
              )}
              
              {/* Checkbox Master Baris */}
              {enabledColumns.length > 0 ? (
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer mr-1.5 flex-shrink-0"
                  checked={isRowAllChecked}
                  onChange={(e) => handleRowMasterChange(item.menu_id, e.target.checked)}
                />
              ) : (
                <div className="w-4 h-4 mr-1.5 flex-shrink-0"></div>
              )}

              {/* Dinamis Ikon Berdasarkan Tipe Folder/File Menu */}
              <div className="flex items-center gap-2 truncate">
                {hasChildren ? (
                  isExpanded ? <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" /> : <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <Key className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
                
                <span className={`${isChild ? 'text-gray-700 font-medium' : 'font-bold text-gray-900 tracking-wide'}`}>
                  {item.title}
                </span>
              </div>
            </div>
          </td>

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
            return (
              <td key={col.key} className="py-3 px-2 text-center bg-gray-100/10 opacity-20 select-none">
                <span className="text-gray-300 text-xs">-</span>
              </td>
            );
          })}
        </tr>

        {/* Render rekursif anak di bawahnya secara cascading hanya jika status pohon terbuka (isExpanded) */}
        {hasChildren && isExpanded && item.subs.map(sub => (
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

  return (    
    <>
      {notification.show && (
        <div className="fixed top-6 right-20 z-[60] px-6 py-4 rounded-xl shadow-xl border-l-4 bg-white border-green-500 text-gray-800">
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto"> 
        {/* CONTAINER FILTER */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{headerTitle}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Kelola data peran pengguna aplikasi beserta matriks hak akses secara hierarkis.</p>
              </div>
            </div>
          </div>
           
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

        {/* CONTAINER TABEL TREE VIEW */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
              <thead className="bg-slate-100/80 border-b border-gray-200">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-[35%]">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        disabled={matrix.length === 0}
                        checked={isGlobalAllChecked}
                        onChange={(e) => handleGlobalAllChange(e.target.checked)}
                      />
                      <span>Struktur Pohon Menu</span>
                    </div>
                  </th>
                  {accessColumns.map(col => (
                    <th key={col.key} className="py-4 px-2 text-center w-[9%] text-[11px] tracking-normal font-bold">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
              {!selectedRoleId ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 text-sm">
                    Silakan pilih Role terlebih dahulu untuk memuat matriks data.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 text-sm animate-pulse">
                    Memuat matriks hak akses...
                  </td>
                </tr>
              ) : matrix.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400 text-sm">
                    Data tidak ditemukan. Silakan cek database menu Anda.
                  </td>
                </tr>
              ) : (
                /* FILTER UTAMA: Hanya render menu yang bertindak sebagai ROOT (Menu Utama) */
                matrix
                  .filter(item => !item.parent_id || item.parent_id === 1 || item.parent_id === '1' || item.parent_id === 0 || item.parent_id === '0')
                  .map(item => <RenderRow key={item.menu_id} item={item} />)
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* Floating Button Simpan */}
        {selectedRoleId && !loading && (
          <button 
            onClick={handleSave}
            className="fixed right-6 bottom-20 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-lg shadow-xl transition transform hover:-translate-y-0.5 z-50 flex items-center justify-center"
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