import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as Icons from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { USER_URL, PORTFOLIO_URL, CLIENT_URL } from '../Api';

// Data dummy untuk grafik, karena API untuk agregasi data belum ada
const chartData = [
  { name: 'Branding', projects: 12, amt: 2400 },
  { name: 'UI/UX', projects: 8, amt: 2210 },
  { name: 'Development', projects: 21, amt: 2290 },
  { name: 'Marketing', projects: 15, amt: 2000 },
  { name: 'Photography', projects: 5, amt: 2181 },
];

const DashboardHome = () => {
  const [userCount, setUserCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Ambil semua data secara paralel
        const [usersRes, projectsRes, clientsRes] = await Promise.all([
          axios.get(USER_URL, { headers }),
          axios.get(PORTFOLIO_URL, { headers }),
          axios.get(CLIENT_URL, { headers })
        ]);

        setUserCount(usersRes.data.length);
        setProjectCount(projectsRes.data.length);
        setClientCount(clientsRes.data.length);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        // Mungkin tampilkan notifikasi error di sini
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* --- KARTU STATISTIK DINAMIS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={userCount}
          icon={Icons.Users}
          color="bg-indigo-100 text-indigo-600"
          loading={loading}
          linkTo="/hak-akses/user"
        />
        <StatCard
          title="Total Projects"
          value={projectCount}
          icon={Icons.Briefcase}
          color="bg-emerald-100 text-emerald-600"
          loading={loading}
          linkTo="/internal/portfolio"
        />
        <StatCard
          title="Total Clients"
          value={clientCount}
          icon={Icons.Contact}
          color="bg-sky-100 text-sky-600"
          loading={loading}
          linkTo="/internal/clients"
        />
      </div>

      {/* --- GRAFIK INTERAKTIF --- */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg mb-4">Projects by Category</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                <Bar dataKey="projects" fill="#818cf8" name="Total Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};

// Komponen StatCard yang sudah di-refactor
const StatCard = ({ title, value, icon: Icon, color, loading, linkTo }) => {
  const content = (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex justify-between items-start">
              <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse"></div>
                  ) : (
                    <h4 className="text-3xl font-bold text-gray-800">{value}</h4>
                  )}
              </div>
              <div className={`p-3 rounded-lg ${color}`}>
                  <Icon className="w-6 h-6" />
              </div>
          </div>
          <div className="mt-4">
              <span className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View Details &rarr;</span>
          </div>
      </div>
  );

  // Jika loading, jangan berikan link
  if (loading) {
    return content;
  }

  return (
    <Link to={linkTo}>
      {content}
    </Link>
  );
}

export default DashboardHome;