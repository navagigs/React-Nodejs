import React, { useEffect, useState } from 'react';
import { BadgeCheck, FileText, Plus } from 'lucide-react';
import { useMenuPermission } from '../../permissions';
import {
  generatePayroll,
  getEmployees,
  getPayrollComponents,
  getPayrollPeriods,
  getPayrollRecords,
  getPayrollReport,
  getPayrollSlip,
  payrollPeriodAction,
  saveEmployee,
  savePayrollComponent,
  updatePayrollRecord
} from '../../financeApi';
import useFinanceBootstrap from '../../useFinanceBootstrap';
import { asList, dateLabel, idr, periodOptions } from '../../financeUtils';
import FinanceLayout, { FinanceButton, FinanceCard, FinanceField, inputClass } from '../../components/finance/FinanceLayout';
import { FinancePagination, FinanceTable, StatusBadge } from '../../components/finance/FinanceTable';
import FinanceModal from '../../components/finance/FinanceModal';

const emptyEmployee = { employee_code: '', name: '', position: '', department: '', bank_name: '', bank_account: '', join_date: '', base_salary: '', allowance_position: '', allowance_transport: '', allowance_meal: '', allowance_other: '', bpjs_health: '', bpjs_employment: '', pph21: '', is_active: true };
const emptyComponent = { code: '', name: '', component_type: 'earning', calculation: 'fixed', default_amount: '', is_active: true };
const salaryFields = ['base_salary', 'allowance_position', 'allowance_transport', 'allowance_meal', 'allowance_other', 'bonus', 'overtime', 'deduction_late', 'deduction_loan', 'bpjs_health', 'bpjs_employment', 'pph21', 'deduction_other'];

const FinancePayroll = () => {
  const access = useMenuPermission('/finance/payroll');
  const { bootstrap } = useFinanceBootstrap();
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [records, setRecords] = useState([]);
  const [report, setReport] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('');
  const [form, setForm] = useState(emptyEmployee);
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [slip, setSlip] = useState(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [generatePeriod, setGeneratePeriod] = useState(periodOptions()[0]?.value || '');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadEmployees = () => {
    setLoading(true);
    return getEmployees().then((result) => setEmployees(asList(result))).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false));
  };
  const loadComponents = () => {
    setLoading(true);
    return getPayrollComponents().then((result) => setComponents(asList(result))).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false));
  };
  const loadPeriods = () => {
    setLoading(true);
    return getPayrollPeriods().then((result) => {
      const list = asList(result);
      setPeriods(list);
      setPeriodFilter((previous) => previous || list[0]?.id?.toString() || '');
    }).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false));
  };
  const loadRecords = (periodId = periodFilter) => {
    if (!periodId) { setRecords([]); return; }
    setLoading(true);
    return getPayrollRecords({ period_id: periodId }).then((result) => {
      setRecords(asList(result));
      if (result?.total !== undefined) setMeta({ total: Number(result.total || 0), page: Number(result.page || 1), limit: 10 });
    }).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false));
  };
  const loadReport = (periodId = periodFilter) => {
    setLoading(true);
    return getPayrollReport({ period_id: periodId }).then(setReport).catch(() => setReport(null)).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!access.canView) return;
    loadEmployees();
    loadComponents();
    loadPeriods();
  }, [access.canView]);

  useEffect(() => {
    if (!periodFilter) return;
    loadRecords(periodFilter);
    loadReport(periodFilter);
  }, [periodFilter]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const openModal = (type, row = null) => {
    if (type === 'employee') setForm(row ? { ...emptyEmployee, ...row } : emptyEmployee);
    if (type === 'component') setForm(row ? { ...emptyComponent, ...row } : emptyComponent);
    if (type === 'correction') setForm({ reason: '', ...Object.fromEntries(salaryFields.map((field) => [field, row?.[field] || ''])) });
    setSelected(row);
    setModal(type);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (modal === 'employee') {
        const { id, ...payload } = form;
        await saveEmployee(id ? { id, ...payload } : payload);
        loadEmployees();
      } else if (modal === 'component') {
        await savePayrollComponent(form);
        loadComponents();
      } else {
        await updatePayrollRecord(selected.id, form);
        loadRecords();
      }
      notify('Data berhasil disimpan.');
      setModal('');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (period, action) => {
    try {
      const payload = action === 'pay' ? { account_id: payAccountId || bootstrap.cash_accounts[0]?.id } : {};
      const result = await payrollPeriodAction(period.id, action, payload);
      notify(result?.message || 'Aksi berhasil.');
      loadPeriods();
      loadRecords(period.id);
      loadReport(period.id);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const doGenerate = async () => {
    try {
      const result = await generatePayroll({ period: generatePeriod });
      notify(result?.message || 'Payroll digenerate.');
      loadPeriods();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const openSlip = async (record) => {
    try {
      const result = await getPayrollSlip(record.id);
      setSlip(result?.data || null);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const employeeColumns = [
    { key: 'employee_code', label: 'Kode' },
    { key: 'name', label: 'Nama', render: (row) => <span className="font-bold text-slate-700">{row.name}</span> },
    { key: 'position', label: 'Jabatan' },
    { key: 'department', label: 'Departemen' },
    { key: 'base_salary', label: 'Gaji Pokok', align: 'right', render: (row) => idr(row.base_salary) },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {access.canEdit ? <FinanceButton onClick={() => openModal('employee', row)}>Ubah</FinanceButton> : null}
      </div>
    ) }
  ];

  const periodColumns = [
    { key: 'period', label: 'Periode', render: (row) => <span className="font-bold text-slate-700">{row.period}</span> },
    { key: 'pay_date', label: 'Tanggal Gaji', render: (row) => dateLabel(row.pay_date) },
    { key: 'employee_count', label: 'Karyawan', align: 'right' },
    { key: 'total_net', label: 'Total Gaji Bersih', align: 'right', render: (row) => idr(row.total_net) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {row.status === 'draft' && access.canEdit ? <FinanceButton onClick={() => act(row, 'submit')}>Ajukan</FinanceButton> : null}
        {row.status === 'approval' && bootstrap.can_approve ? <FinanceButton variant="success" onClick={() => act(row, 'approve')}><BadgeCheck className="h-3.5 w-3.5" /> Setujui</FinanceButton> : null}
        {row.status === 'approved' && access.canEdit ? <FinanceButton variant="primary" onClick={() => act(row, 'pay')}>Bayar</FinanceButton> : null}
        <FinanceButton onClick={() => setPeriodFilter(String(row.id))}>Lihat</FinanceButton>
      </div>
    ) }
  ];

  const recordColumns = [
    { key: 'employee_code', label: 'Kode' },
    { key: 'employee_name', label: 'Nama' },
    { key: 'department', label: 'Departemen' },
    { key: 'total_income', label: 'Pendapatan', align: 'right', render: (row) => idr(row.total_income) },
    { key: 'total_deduction', label: 'Potongan', align: 'right', render: (row) => idr(row.total_deduction) },
    { key: 'net_pay', label: 'Gaji Bersih', align: 'right', render: (row) => <span className="font-bold text-slate-800">{idr(row.net_pay)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        <FinanceButton onClick={() => openSlip(row)}><FileText className="h-3.5 w-3.5" /> Slip</FinanceButton>
        {['draft', 'approval'].includes(row.period_status) && access.canEdit ? <FinanceButton onClick={() => openModal('correction', row)}>Koreksi</FinanceButton> : null}
      </div>
    ) }
  ];

  const componentColumns = [
    { key: 'code', label: 'Kode' },
    { key: 'name', label: 'Nama' },
    { key: 'component_type', label: 'Jenis', render: (row) => <span className="capitalize">{row.component_type}</span> },
    { key: 'calculation', label: 'Perhitungan' },
    { key: 'default_amount', label: 'Nominal Default', align: 'right', render: (row) => idr(row.default_amount) },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} /> },
    { key: 'actions', label: 'Aksi', align: 'right', render: (row) => (
      <div className="flex items-center justify-end gap-1">
        {access.canEdit ? <FinanceButton onClick={() => openModal('component', row)}>Ubah</FinanceButton> : null}
      </div>
    ) }
  ];

  return (
    <FinanceLayout
      title="Penggajian"
      subtitle="Kelola karyawan, komponen gaji, periode, dan pembayaran payroll"
      notification={notification}
      onDismissNotification={() => setNotification(null)}
      actions={[
        tab === 'employees' && access.canCreate ? <FinanceButton key="employee" variant="primary" onClick={() => openModal('employee')}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null,
        tab === 'components' && access.canCreate ? <FinanceButton key="component" variant="primary" onClick={() => openModal('component')}><Plus className="h-4 w-4" /> Tambah</FinanceButton> : null
      ].filter(Boolean)}
    >
      <div className="flex flex-wrap gap-2">
        {[['employees', 'Karyawan'], ['periods', 'Periode & Slip'], ['components', 'Komponen Gaji']].map(([key, label]) => (
          <FinanceButton key={key} variant={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key)}>{label}</FinanceButton>
        ))}
      </div>

      {tab === 'employees' ? (
        <>
          <FinanceTable columns={employeeColumns} rows={employees} loading={loading} emptyText="Belum ada karyawan." page={meta.page} limit={meta.limit} />
          <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
        </>
      ) : null}

      {tab === 'periods' ? (
        <div className="space-y-5">
          <FinanceCard title="Generate Payroll" subtitle="Buat periode gaji dari data karyawan aktif">
            <div className="flex flex-wrap items-end gap-3">
              <FinanceField label="Periode">
                <select className={inputClass} value={generatePeriod} onChange={(event) => setGeneratePeriod(event.target.value)}>
                  {periodOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FinanceField>
              <FinanceField label="Rekening Pembayaran">
                <select className={inputClass} value={payAccountId} onChange={(event) => setPayAccountId(event.target.value)}>
                  <option value="">Gunakan rekening periode</option>
                  {bootstrap.cash_accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </FinanceField>
              {access.canCreate ? <FinanceButton variant="primary" onClick={doGenerate}>Generate</FinanceButton> : null}
            </div>
          </FinanceCard>

          {report?.summary ? (
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                ['Karyawan', report.summary.employees],
                ['Total Pendapatan', idr(report.summary.total_income)],
                ['Total Potongan', idr(report.summary.total_deduction)],
                ['Total Gaji Bersih', idr(report.summary.net_pay)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                  <p className="mt-2 text-lg font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <FinanceCard title="Periode Payroll">
            <FinanceTable columns={periodColumns} rows={periods} loading={loading} emptyText="Belum ada periode payroll." page={meta.page} limit={meta.limit} />
            <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
          </FinanceCard>

          <FinanceCard title={`Rincian Gaji ${periodFilter || ''}`}>
            <FinanceTable columns={recordColumns} rows={records} loading={loading} emptyText="Belum ada rincian gaji." page={meta.page} limit={meta.limit} />
            <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
          </FinanceCard>
        </div>
      ) : null}

      {tab === 'components' ? (
        <>
          <FinanceTable columns={componentColumns} rows={components} loading={loading} emptyText="Belum ada komponen gaji." page={meta.page} limit={meta.limit} />
          <FinancePagination page={meta.page} total={meta.total} limit={meta.limit} onPageChange={(page) => setMeta({ ...meta, page })} onPageSizeChange={(size) => setMeta({ ...meta, page: 1, limit: Number(size) })} />
        </>
      ) : null}

      <FinanceModal open={modal === 'employee'} title={form.id ? 'Ubah Karyawan' : 'Karyawan Baru'} onClose={() => setModal('')} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['employee_code', 'Kode Karyawan'], ['name', 'Nama'], ['position', 'Jabatan'], ['department', 'Departemen'],
            ['bank_name', 'Bank'], ['bank_account', 'No. Rekening'], ['join_date', 'Tanggal Bergabung']
          ].map(([key, label]) => (
            <FinanceField key={key} label={label}><input type={key === 'join_date' ? 'date' : 'text'} className={inputClass} value={form[key] || ''} onChange={(event) => update(key, event.target.value)} /></FinanceField>
          ))}
          {salaryFields.slice(0, 8).map((field) => (
            <FinanceField key={field} label={field.replace(/_/g, ' ')}><input type="number" className={inputClass} value={form[field] || ''} onChange={(event) => update(field, event.target.value)} /></FinanceField>
          ))}
          <FinanceField label="Aktif">
            <select className={inputClass} value={form.is_active ? '1' : '0'} onChange={(event) => update('is_active', event.target.value === '1')}>
              <option value="1">Aktif</option><option value="0">Nonaktif</option>
            </select>
          </FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={modal === 'component'} title={form.id ? 'Ubah Komponen' : 'Komponen Baru'} onClose={() => setModal('')} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinanceField label="Kode"><input required className={inputClass} value={form.code || ''} onChange={(event) => update('code', event.target.value)} /></FinanceField>
          <FinanceField label="Nama"><input required className={inputClass} value={form.name || ''} onChange={(event) => update('name', event.target.value)} /></FinanceField>
          <FinanceField label="Jenis">
            <select className={inputClass} value={form.component_type} onChange={(event) => update('component_type', event.target.value)}>
              <option value="earning">Pendapatan</option><option value="deduction">Potongan</option>
            </select>
          </FinanceField>
          <FinanceField label="Perhitungan"><input className={inputClass} value={form.calculation || ''} onChange={(event) => update('calculation', event.target.value)} /></FinanceField>
          <FinanceField label="Nominal Default"><input type="number" className={inputClass} value={form.default_amount || ''} onChange={(event) => update('default_amount', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={modal === 'correction'} title={selected?.employee_name ? `Koreksi Gaji · ${selected.employee_name}` : 'Koreksi Gaji'} onClose={() => setModal('')} onSubmit={submit} submitting={submitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          {salaryFields.map((field) => (
            <FinanceField key={field} label={field.replace(/_/g, ' ')}><input type="number" className={inputClass} value={form[field] || ''} onChange={(event) => update(field, event.target.value)} /></FinanceField>
          ))}
          <FinanceField label="Alasan Koreksi" className="sm:col-span-2"><textarea required rows="2" className={inputClass} value={form.reason || ''} onChange={(event) => update('reason', event.target.value)} /></FinanceField>
        </div>
      </FinanceModal>

      <FinanceModal open={!!slip} title="Slip Gaji" onClose={() => setSlip(null)} onSubmit={(event) => event.preventDefault()} submitLabel="Tutup">
        {slip ? (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sm:col-span-2">
              <div><p className="font-black text-slate-800">{slip.company_name}</p><p className="text-xs text-slate-500">Slip Gaji {slip.period}</p></div>
              <div className="text-right"><p className="font-bold">{slip.employee_name}</p><p className="text-xs text-slate-500">{slip.employee_code} · {slip.department}</p></div>
            </div>
            {[
              ['Gaji Pokok', slip.base_salary], ['Tunjangan Jabatan', slip.allowance_position], ['Tunjangan Transport', slip.allowance_transport],
              ['Tunjangan Makan', slip.allowance_meal], ['Bonus', slip.bonus], ['Lembur', slip.overtime], ['Total Pendapatan', slip.total_income],
              ['Potongan', slip.total_deduction], ['Gaji Bersih', slip.net_pay]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-500">{label}</span><span className="font-bold text-slate-800">{idr(value)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </FinanceModal>
    </FinanceLayout>
  );
};

export default FinancePayroll;
