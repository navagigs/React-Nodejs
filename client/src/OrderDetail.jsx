import React from 'react';
import * as Icons from 'lucide-react';

// --- HELPER: FORMAT RUPIAH ---
const formatIDR = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const OrderDetail = () => {
  
  // --- MOCK DATA BARANG (Tema: Kue & Permen Jahe) ---
  const items = [
    { 
        id: 1, 
        name: 'Permen Jahe Wangi (Pack 250g)', 
        sku: 'JAHE-SWT-250', 
        qty: 20, 
        price: 25000, 
        // FOTO BARU: Permen/Manisan Jahe
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMKsrOkj0ZK2GBjm_fq0USMVtO8dko6MgBgg&s' 
    },
    { 
        id: 2, 
        name: 'Lapis Legit Premium (Loyang Penuh)', 
        sku: 'KUE-LAPIS-ORIG', 
        qty: 2, 
        price: 650000, 
        // Gambar Kue Lapis
        image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=100&q=80' 
    },
    { 
        id: 3, 
        name: 'Cookies Jahe & Kayu Manis', 
        sku: 'COOKIES-JAHE-KM', 
        qty: 5, 
        price: 85000, 
        // Gambar Cookies
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&q=80' 
    },
  ];

  // Hitung Subtotal Otomatis
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const shipping = 35000; // Ongkir makanan
  const tax = subtotal * 0.11; // PPN 11%
  const grandTotal = subtotal + shipping + tax;

  // --- INFO ORDER (Bahasa Indonesia) ---
  const orderInfo = {
    id: '#PO-FOOD-9921',
    date: '24 Des 2025',
    status: 'Dalam Pengiriman', // Bahasa Indonesia
    customer: 'Toko Oleh-Oleh "Sari Rasa"',
    address: 'Jl. Cimareme No. 12, Bandung Barat, Indonesia',
    phone: '+62 812 9988 7766',
  };

  // --- TRACKING STEPS (Bahasa Indonesia) ---
  const trackingSteps = [
    { title: 'Pesanan Dibuat', date: '24 Des, 08:00 WIB', status: 'completed', desc: 'Pesanan telah diterima oleh dapur' },
    { title: 'Pembayaran Dikonfirmasi', date: '24 Des, 08:15 WIB', status: 'completed', desc: 'Pembayaran telah diverifikasi' },
    { title: 'Produksi & Pengemasan', date: '24 Des, 10:00 WIB', status: 'completed', desc: 'Barang sedang dibuat dan dikemas segar' },
    { title: 'Dikirim', date: '24 Des, 14:00 WIB', status: 'active', desc: 'Kurir telah mengambil paket dari lokasi' },
    { title: 'Diterima', date: 'Estimasi 25 Des', status: 'pending', desc: 'Paket diterima oleh pelanggan' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">Detail Pesanan</h2>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                {orderInfo.status}
              </span>
           </div>
           <p className="text-gray-500 text-sm mt-1">ID Pesanan: <span className="font-mono text-gray-700 font-medium">{orderInfo.id}</span> • {orderInfo.date}</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition">
                <Icons.Printer className="w-4 h-4" /> Cetak Faktur
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition shadow-lg shadow-indigo-200">
                <Icons.Download className="w-4 h-4" /> Unduh PO
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* --- KOLOM KIRI: INFO & BARANG --- */}
        <div className="xl:col-span-2 space-y-6">
            
            {/* TABEL BARANG */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Icons.UtensilsCrossed className="w-4 h-4 text-indigo-500" /> Barang yang Dipesan
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Produk</th>
                                <th className="px-6 py-3 text-center">Jml</th>
                                <th className="px-6 py-3 text-right">Harga Satuan</th>
                                <th className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                                <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-600">x{item.qty}</td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-600">{formatIDR(item.price)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-800">{formatIDR(item.price * item.qty)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* SUMMARY HARGA */}
                <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
                    <div className="flex flex-col gap-2 items-end">
                        <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatIDR(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Biaya Pengiriman (Kilat)</span>
                                <span>{formatIDR(shipping)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Pajak (PPN 11%)</span>
                                <span>{formatIDR(tax)}</span>
                            </div>
                            <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-center">
                                <span className="font-bold text-gray-800">Total Pesanan</span>
                                <span className="font-bold text-xl text-indigo-600">{formatIDR(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* INFO CUSTOMER & ADDRESS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h4 className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-wider">Detail Pelanggan</h4>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-1">
                            <Icons.User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{orderInfo.customer}</p>
                            <p className="text-sm text-gray-500">{orderInfo.phone}</p>
                            <p className="text-sm text-blue-500 mt-1 cursor-pointer hover:underline">Lihat Profil</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h4 className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-wider">Alamat Pengiriman</h4>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600 mt-1">
                            <Icons.MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">Cabang Pusat</p>
                            <p className="text-sm text-gray-500 leading-relaxed mt-1">{orderInfo.address}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- KOLOM KANAN: TRACKING --- */}
        <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Icons.Truck className="w-4 h-4 text-indigo-500" /> Status Pengiriman
                    </h3>
                </div>
                <div className="p-6">
                    <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                        {trackingSteps.map((step, index) => {
                            let iconColor = "bg-gray-100 text-gray-400 border-gray-200";
                            if (step.status === 'completed') iconColor = "bg-green-100 text-green-600 border-green-200";
                            if (step.status === 'active') iconColor = "bg-indigo-600 text-white border-indigo-200 shadow-lg shadow-indigo-200";

                            return (
                                <div key={index} className="relative pl-6">
                                    <div className={`absolute -left-[21px] top-0 w-10 h-10 rounded-full border-4 ${step.status === 'active' ? 'border-indigo-50' : 'border-white'} flex items-center justify-center ${iconColor} transition-all`}>
                                        {step.status === 'completed' ? (
                                            <Icons.Check className="w-5 h-5" />
                                        ) : step.status === 'active' ? (
                                            <Icons.Truck className="w-5 h-5 animate-pulse" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                                        )}
                                    </div>
                                    <div className={`flex flex-col ${step.status === 'pending' ? 'opacity-50' : ''}`}>
                                        <span className="text-xs text-gray-400 font-medium mb-0.5">{step.date}</span>
                                        <h4 className={`text-sm font-bold ${step.status === 'active' ? 'text-indigo-600' : 'text-gray-800'}`}>
                                            {step.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-8 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <p className="text-xs text-indigo-700 font-medium mb-1">Estimasi Kedatangan</p>
                        <p className="text-sm text-indigo-900 font-bold">Jumat, 25 Des, 17:00 WIB</p>
                        <p className="text-xs text-indigo-600/80 mt-2">Kurir: FoodExpress (Penanganan Segar)</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default OrderDetail;