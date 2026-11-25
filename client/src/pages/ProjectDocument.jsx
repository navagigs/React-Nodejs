import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { PROJECT_DOCUMENT_URL, PORTFOLIO_URL, CLIENT_URL } from '../Api';
import TableExports from '../TableExports';
import PageSizeSelect from '../PageSizeSelect';
import { useTablePagination } from '../tablePagination';
import { useMenuPermission } from '../permissions';
import FeaturePageHeader from '../components/layout/FeaturePageHeader';
import * as Icons from 'lucide-react';

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import htmlEditButton from 'quill-html-edit-button';
import { html as beautifyHtml } from 'js-beautify';


// Registrasi modul alignment agar mendukung rata kiri-kanan (justify) di Quill secara absolut
const Quill = ReactQuill.Quill; 
Quill.register('modules/htmlEditButton', htmlEditButton);
// === TAMBAHKAN KODE INI UNTUK MENGAKTIFKAN INLINE STYLE ===
const DirectionAttribute = Quill.import('attributors/style/direction');
const AlignStyle = Quill.import('attributors/style/align');
const BackgroundStyle = Quill.import('attributors/style/background');
const ColorStyle = Quill.import('attributors/style/color');
const FontStyle = Quill.import('attributors/style/font');
const SizeStyle = Quill.import('attributors/style/size');
// === REGISTRASI LANGSUNG TANPA MEMBUAT VARIABEL BARU ===
Quill.register(Quill.import('attributors/style/direction'), true);
Quill.register(Quill.import('attributors/style/align'), true);
Quill.register(Quill.import('attributors/style/background'), true);
Quill.register(Quill.import('attributors/style/color'), true);
Quill.register(Quill.import('attributors/style/font'), true);
Quill.register(Quill.import('attributors/style/size'), true);
// ========================================================
// ========================================================

const BAPP_FONT = 'Tahoma, sans-serif';
const BAPP_EVIDENCE_URL = 'https://bit.ly/DokumenPeningkatanSiberDapenTelkom2026';
const BAPP_DEFAULT_TITLE = 'LAMPIRAN BERITA ACARA PENYELESAIAN PEKERJAAN (BAPP)';
const BAPP_DEFAULT_RESULT = 'Terpenuhi';
const BAPP_DEFAULT_CHECK = 'Pekerjaan selesai, deliverables tersedia dan sesuai';

const BAPP_DELIVERABLES = [
    {
        no: 'A.',
        title: 'Penanganan Ancaman Zero-Day PHP2Shell (Objek: dapentelkom.co.id, simpul.dapentelkom.co.id, simulasi.dapentelkom.co.id)',
        items: [
            { no: '1', scope: 'Inventarisasi PHP Engine (runtime PHP, extension, web server handler mod_php / PHP-FPM) pada server cloud dan target Data Center Jakarta.' },
            { no: '2', scope: 'Upgrading & Emergency Patching Engine PHP ke versi rilis aman resmi (PHP 8.5.12/8.4.27/8.3.36/8.2.35+) untuk menutup celah RCE CVE-2026-109618 & CVE-2026-109619 serta menonaktifkan PHP info.' },
            { no: '3', scope: 'Hardening konfigurasi PHP Engine (php.ini) & Worker Process (disable_functions, menonaktifkan allow_url_fopen/allow_url_include, alokasi memori worker).' },
            { no: '4', scope: 'Code Compatibility Check & Refactoring sintaksis dan fungsi source code PHP/Framework agar kompatibel dengan versi PHP terbaru.' },
            { no: '5', scope: 'Integration Scan Rules & WAF Mitigation pada SonarQube dan WAF untuk memblokir payload exploit PHP2Shell RCE secara real-time.' },
            { no: '6', scope: 'Deliverable: Laporan Penanganan Ancaman Zero-Day PHP2Shell.' }
        ]
    },
    {
        no: 'B.',
        title: 'Perbaikan Vulnerability Assessment (VA) Cyber Security Telkom 2026',
        items: [
            { no: '1', scope: 'Upgrade System: Web Service Apache (v2.4.66+), jQuery & seluruh pustaka JS terkait, patching SSH Server (mengatasi kerentanan Terrapin), serta upgrade Bootstrap.' },
            { no: '2', scope: 'Rekonfigurasi System: Rekonfigurasi TLS ke versi stabil terbaru, pembaruan SSL Certificate (penyesuaian CN/SAN), penonaktifan Directory Listing (Options Indexes), dan rekonfigurasi Session Cookies.' },
            { no: '3', scope: 'Deliverable: Laporan Perbaikan Vulnerability Assessment (VA) Cyber Security Telkom 2026.' }
        ]
    },
    {
        no: 'C.',
        title: 'Pemasangan & Konfigurasi Frame Continuous Integration/Continuous Delivery (CI/CD)',
        items: [
            { no: '1', scope: 'Implementasi & integrasi 6 toolsets DevSecOps On-Premise: Gitea (SCM), Jenkins (CI/CD Engine), SonarQube (SAST/Quality Gate), Harbor (Private Container Registry), Infisical (Secrets Management), dan OpenObserve (Log & Observability).' },
            { no: '2', scope: 'Penyusunan panduan konfigurasi, dokumentasi Jenkinsfile multi-stage pipeline, standar Quality Gate, dan Scan Policy.' },
            { no: '3', scope: 'Deliverable: Laporan Pemasangan & Konfigurasi Frame Continuous Integration/Continuous Delivery (CI/CD).' }
        ]
    },
    {
        no: 'D.',
        title: 'Migrasi Public Web ke Data Center Dana Pensiun Telkom (Jakarta)',
        items: [
            { no: '1', scope: 'Persiapan & Pre-Migration (inventarisasi source code, database, konfigurasi web server, dependensi library, dan integrasi API).' },
            { no: '2', scope: 'Provisioning Server di Data Center Jakarta (Setting OS, IP Address, Network Hardening, Firewall/WAF Rules, dan SSL Certificate).' },
            { no: '3', scope: 'Penyelarasan & Remediasi Keamanan (Security Remediation) pada server On-Premise Data Center Jakarta.' },
            { no: '4', scope: 'Migrasi Data (backup/dump & restore database), deployment aplikasi, pengujian fungsi (UAT), simulasi Cutover & Rollback Plan, serta Go-Live.' },
            { no: '5', scope: 'Penerapan Standard Security Tata Kelola Keamanan Informasi TELKOM Group (MFA/2FA, UAM & Least Privilege, enkripsi password min. SHA256, CAPTCHA login, dan centralized logging min. 3 bulan).' },
            { no: '6', scope: 'Deliverable: Laporan Migrasi Public Web ke Data Center Dana Pensiun Telkom.' }
        ]
    }
];

const createDefaultBappAttachment = (project) => ({
    title: BAPP_DEFAULT_TITLE,
    project_title: (project && (project.title || project.name)) || '',
    evidence_url: BAPP_EVIDENCE_URL,
    sections: BAPP_DELIVERABLES.map(section => ({
        no: section.no,
        title: section.title,
        items: section.items.map(item => ({
            no: item.no,
            scope: item.scope,
            result: BAPP_DEFAULT_RESULT,
            check: BAPP_DEFAULT_CHECK
        }))
    }))
});

const normalizeBappAttachment = (raw, project) => {
    let data = raw;
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw);
        } catch {
            data = null;
        }
    }

    const fallback = createDefaultBappAttachment(project);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fallback;

    const sections = Array.isArray(data.sections) && data.sections.length > 0
        ? data.sections.map((section, sectionIndex) => ({
            no: section && section.no ? section.no : `${String.fromCharCode(65 + sectionIndex)}.`,
            title: section && section.title ? section.title : '',
            items: Array.isArray(section && section.items) && section.items.length > 0
                ? section.items.map((item, itemIndex) => ({
                    no: item && item.no ? item.no : String(itemIndex + 1),
                    scope: item && item.scope ? item.scope : '',
                    result: item && item.result ? item.result : BAPP_DEFAULT_RESULT,
                    check: item && item.check ? item.check : BAPP_DEFAULT_CHECK
                }))
                : []
        }))
        : fallback.sections;

    return {
        title: data.title || fallback.title,
        project_title: data.project_title || fallback.project_title,
        evidence_url: data.evidence_url || fallback.evidence_url,
        sections
    };
};

const serializeBappAttachment = (value) => typeof value === 'string' ? value : JSON.stringify(value || {});

const BAPP_PAGE_WIDTH = 794;
const BAPP_PAGE_HEIGHT = 1122;
const BAPP_PAGE_PADDING = { top: 44, right: 62, bottom: 44, left: 62 };

const DocPageFooter = ({ label, projectTitle, pageNumber, totalPages, sidePadding = 78 }) => (
    <div
        className="absolute flex justify-between items-end pointer-events-none text-black"
        style={{
            left: sidePadding,
            right: sidePadding,
            bottom: 14,
            fontFamily: BAPP_FONT,
            fontSize: '8pt',
            lineHeight: 1.1
        }}
    >
        <span className="min-w-0 flex-1 pr-3 break-words">
            {label} {projectTitle}
        </span>
        <span className="shrink-0 whitespace-nowrap">Halaman #{pageNumber}/{totalPages}</span>
    </div>
);

const BappLampiranPages = ({ attachment, projectTitle, contractNumber, contractDate, lineHeight, signature, signatureKey, onPageCountChange, pageStartNumber, totalPages, sidePadding = BAPP_PAGE_PADDING.right, canExport }) => {
    const measureRef = useRef(null);
    const [pages, setPages] = useState([]);
    const [ready, setReady] = useState(false);

    const rows = useMemo(() => {
        const result = [];
        attachment.sections.forEach((section, sectionIndex) => {
            result.push({ type: 'section', key: `section-${sectionIndex}`, no: section.no, title: section.title });
            section.items.forEach((item, itemIndex) => {
                result.push({
                    type: 'item',
                    key: `item-${sectionIndex}-${itemIndex}`,
                    no: item.no,
                    scope: item.scope,
                    result: item.result,
                    check: item.check
                });
            });
        });
        return result;
    }, [attachment]);

    useLayoutEffect(() => {
        const measure = measureRef.current;
        if (!measure) return;

        const headerEl = measure.querySelector('[data-bapp-header]');
        const introEl = measure.querySelector('[data-bapp-intro]');
        const theadEl = measure.querySelector('[data-bapp-thead] tr') || measure.querySelector('[data-bapp-thead]');
        const rowEls = Array.from(measure.querySelectorAll('[data-bapp-row]'));
        const evidenceEl = measure.querySelector('[data-bapp-evidence]');
        const signatureEl = measure.querySelector('[data-bapp-signature]');
        const measuredHeight = (el) => el ? el.getBoundingClientRect().height : 0;

        const headerHeight = measuredHeight(headerEl) + 12;
        const introHeight = introEl ? measuredHeight(introEl) + 12 : 0;
        const tableHeaderHeight = measuredHeight(theadEl);
        const rowHeights = rowEls.map(measuredHeight);
        const heightByKey = new Map(rows.map((row, index) => [row.key, rowHeights[index] || 0]));
        const evidenceHeight = evidenceEl ? measuredHeight(evidenceEl) + 12 : 0;
        const signatureHeight = measuredHeight(signatureEl);
        const footerHeight = evidenceHeight + signatureHeight;
        const usableHeight = BAPP_PAGE_HEIGHT - BAPP_PAGE_PADDING.top - BAPP_PAGE_PADDING.bottom - headerHeight - introHeight - tableHeaderHeight;
        const lastPageCapacity = Math.max(usableHeight - footerHeight, 160);

        const grouped = [[]];
        const heights = [0];
        rows.forEach((row) => {
            const rowHeight = heightByKey.get(row.key) || 0;
            const current = grouped.length - 1;
            if (heights[current] + rowHeight > usableHeight && grouped[current].length > 0) {
                grouped.push([]);
                heights.push(0);
            }
            const target = grouped.length - 1;
            grouped[target].push(row);
            heights[target] += rowHeight;
        });

        while (grouped.length > 1 && heights[grouped.length - 1] > lastPageCapacity) {
            const prev = grouped.length - 2;
            const moved = grouped[prev].pop();
            if (!moved) break;
            const movedHeight = heightByKey.get(moved.key) || 0;
            grouped[grouped.length - 1].unshift(moved);
            heights[grouped.length - 1] += movedHeight;
            heights[prev] -= movedHeight;
        }

        if (grouped.length === 1 && heights[0] > lastPageCapacity) {
            const carry = [];
            let carryHeight = 0;
            while (grouped[0].length > 1 && heights[0] > lastPageCapacity) {
                const moved = grouped[0].pop();
                const movedHeight = heightByKey.get(moved.key) || 0;
                carry.unshift(moved);
                carryHeight += movedHeight;
                heights[0] -= movedHeight;
            }
            grouped.push(carry);
            heights.push(carryHeight);
        }

        const timer = setTimeout(() => {
            setPages(grouped);
            setReady(true);
            if (onPageCountChange) onPageCountChange(grouped.length);
        }, 0);
        return () => clearTimeout(timer);
    }, [rows, contractNumber, contractDate, lineHeight, signatureKey, onPageCountChange]);

    const pageStyle = {
        width: BAPP_PAGE_WIDTH,
        height: BAPP_PAGE_HEIGHT,
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: BAPP_FONT,
        padding: `${BAPP_PAGE_PADDING.top}px ${BAPP_PAGE_PADDING.right}px ${BAPP_PAGE_PADDING.bottom}px ${BAPP_PAGE_PADDING.left}px`
    };

    const measureStyle = {
        ...pageStyle,
        position: 'fixed',
        left: -99999,
        top: 0,
        height: 'auto',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1
    };

    const borderCell = 'border border-gray-400 px-2 py-1.5 align-top break-words';

    const renderHeader = () => (
        <div className="text-center mb-3" data-bapp-header>
            <h2 className="font-bold uppercase leading-tight" style={{ fontSize: '10.5pt' }}>{attachment.title}</h2>
            <h3 className="font-bold uppercase leading-tight mt-1" style={{ fontSize: '10.5pt' }}>{projectTitle}</h3>
        </div>
    );

    const renderIntro = () => (
        <p className="text-justify mb-3" data-bapp-intro style={{ fontSize: '10.5pt', lineHeight }}>
            Telah dilakukan pekerjaan sesuai Surat Pesanan {projectTitle} Nomor: {contractNumber} tanggal {contractDate}, meliputi kegiatan sebagai berikut:
        </p>
    );

    const renderRow = (row, rowIndex, isMeasure) => {
        if (row.type === 'section') {
            return (
                <tr key={row.key} className="bg-gray-200 font-bold" data-bapp-row={isMeasure ? rowIndex : undefined}>
                    <td className={`${borderCell} text-center`}>{row.no}</td>
                    <td className={borderCell} colSpan={3}>{row.title}</td>
                </tr>
            );
        }
        return (
            <tr key={row.key} data-bapp-row={isMeasure ? rowIndex : undefined}>
                <td className={`${borderCell} text-center`}>{row.no}</td>
                <td className={borderCell}>{row.scope}</td>
                <td className={`${borderCell} text-center`}>{row.result}</td>
                <td className={borderCell}>{row.check}</td>
            </tr>
        );
    };

    const renderTable = (pageRows, isMeasure) => (
        <table className="w-full border-collapse" style={{ fontSize: '8.5pt', lineHeight: 1.2 }}>
            <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '50%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '28%' }} />
            </colgroup>
            <thead data-bapp-thead>
                <tr className="bg-gray-200 text-center font-bold">
                    <th className={borderCell}>No</th>
                    <th className={borderCell}>Lingkup &amp; Hasil Penyerahan</th>
                    <th className={borderCell}>Hasil Pekerjaan / Penyelesaian PIHAK KEDUA</th>
                    <th className={borderCell}>Hasil Pemeriksaan PIHAK PERTAMA</th>
                </tr>
            </thead>
            <tbody>{pageRows.map((row, rowIndex) => renderRow(row, rowIndex, isMeasure))}</tbody>
        </table>
    );

    const renderFooter = () => (
        <div data-bapp-footer>
            {attachment.evidence_url && (
                <p className="mt-3" data-bapp-evidence style={{ fontSize: '10.5pt', lineHeight }}>
                    Evidence pekerjaan dapat diakses pada tautan:{' '}
                    {canExport ? (
                        <a href={attachment.evidence_url} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">
                            {attachment.evidence_url}
                        </a>
                    ) : (
                        <span className="break-all">{attachment.evidence_url}</span>
                    )}
                </p>
            )}
            <div data-bapp-signature style={{ display: 'flow-root' }}>{signature}</div>
        </div>
    );

    const displayPages = ready && pages.length > 0 ? pages : [rows];

    return (
        <>
            <div ref={measureRef} style={measureStyle}>
                {renderHeader()}
                {renderIntro()}
                {renderTable(rows, true)}
                {renderFooter()}
            </div>
            {displayPages.map((pageRows, pageIndex, allPages) => (
                <div
                    key={`lampiran-page-${pageIndex}`}
                    className="pdf-page-bundle bg-white text-black shrink-0"
                    style={pageStyle}
                >
                    {renderHeader()}
                    {pageIndex === 0 && renderIntro()}
                    {renderTable(pageRows, false)}
                    {pageIndex === allPages.length - 1 && renderFooter()}
                    <DocPageFooter
                        label="BAPP"
                        projectTitle={projectTitle}
                        pageNumber={pageStartNumber + pageIndex}
                        totalPages={totalPages}
                        sidePadding={sidePadding}
                    />
                </div>
            ))}
        </>
    );
};

const ProjectDocument = ({ projectId }) => {
    const access = useMenuPermission('/internal/project-documents');

    // STATE MANAGEMENT
    const [documents, setDocuments] = useState([]);
    const [portfolios, setPortfolios] = useState([]); 
    const [viewMode, setViewMode] = useState('table');
      const [clients, setClients] = useState([]);  // 'table', 'form'
    
    const [previewLetter, setPreviewLetter] = useState(null); 
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [docLineSpacing, setDocLineSpacing] = useState('1.5');
    const [lampiranPageCount, setLampiranPageCount] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterClient, setFilterClient] = useState('');
   
    const [syncBappPihak1, setSyncBappPihak1] = useState(false);
    const [syncBappPihak2, setSyncBappPihak2] = useState(false);
    const [syncBastPihak1, setSyncBastPihak1] = useState(false);
    const [syncBastPihak2, setSyncBastPihak2] = useState(false);
    const [portfolioSearch, setPortfolioSearch] = useState('');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const projectDropdownRef = useRef(null);
    const [description, setDescription] = useState('');

    // STATE FORM: MURNI KOSONG SESUAI STRUKTUR API
    const [formData, setFormData] = useState({
        id: null,
        project_id: projectId || '',
        location: '',
        
        inspection_date: '',
        inspection_officer_name_1: '',
        inspection_officer_role_1: '',
        inspection_officer_name_2: '',
        inspection_officer_role_2: '',
        inspection_description: '', 

        progress_date: '',
        progress_officer_name_1: '',
        progress_officer_role_1: '',
        progress_officer_name_2: '',
        progress_officer_role_2: '',
        progress_description: '', 

        handover_date: '',
        handover_officer_name_1: '',
        handover_officer_role_1: '',
        handover_officer_name_2: '',
        handover_officer_role_2: '',
        handover_description: '',
        bapp_attachment: createDefaultBappAttachment(),
        progress_status: 1, // Default aktif saat create baru
        handover_status: 1,   
    });
    
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' }); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setIsProjectDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

// Fungsi untuk merapikan isi HTML di dalam State
    const handleFormatHTML = (field) => {
        if (!formData[field]) return;

        // Konfigurasi standar agar susunan tag HTML rapi ke bawah
        const options = {
            indent_size: 2,
            wrap_line_length: 60,
            preserve_newlines: true,
            end_with_newline: true
        };

        // Proses merapikan teks HTML
        const rapiHtml = beautifyHtml(formData[field], options);

        // Simpan kembali ke dalam state
        setFormData(prev => ({
            ...prev,
            [field]: rapiHtml
        }));
    };
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    // Update Konfigurasi Modules Anda
    const formQuillModules = {
        toolbar: [
           [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }], // Pastikan baris warna ini aktif di toolbar
            [{ 'align': [] }],
            ['clean']
        ],
        // Tambahkan konfigurasi htmlEditButton di bawah ini
        htmlEditButton: {
            debug: false,
            msg: "Edit kode HTML",
            okText: "Simpan",
            BatalText: "Batal",
            buttonHTML: "&lt;&gt;", // Menampilkan tombol <> di toolbar
        },
        clipboard: {
             matchVisual: false,
        }
    };

      const fetchClients = async () => {
          try {
              const response = await fetch(CLIENT_URL);
              const data = await response.json();
              setClients(data); 
          } catch (error) { console.error("Gagal mengambil data klien:", error); }
      };
    

    const previewQuillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }] // Ditambahkan alignment rata kiri-kanan (justify)
        ],
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => { setNotification((prev) => ({ ...prev, show: false })); }, 3000);
    };

    const fetchPortfolios = async () => {
        try {
            const response = await fetch(`${PORTFOLIO_URL}`);
            if (response.ok) {
                const data = await response.json();
                setPortfolios(Array.isArray(data) ? data : []);
            }
        } catch (error) { console.error(error); }
    };

    const fetchDocuments = async () => {
        try {
            const url = projectId ? `${PROJECT_DOCUMENT_URL}/project/${projectId}` : `${PROJECT_DOCUMENT_URL}`;
            const response = await fetch(url);
            if (response.status === 404) { setDocuments([]); return; }
            if (!response.ok) throw new Error("Gagal memuat data");
            
            const data = await response.json();
            const dataArray = Array.isArray(data) ? data : [data];
            
            const formattedData = dataArray.map(item => ({
                ...item,
                inspection_date: item.inspection_date ? item.inspection_date.split('T')[0] : '',
                progress_date: item.progress_date ? item.progress_date.split('T')[0] : '',
                handover_date: item.handover_date ? item.handover_date.split('T')[0] : '',
            }));
            setDocuments(formattedData);
        } catch (error) {
            showNotification("Gagal mengambil data dokumen dari database", "error");
        }
    };

   
   
  useEffect(() => {
    if (!access.canView) return;
      fetchClients();
        fetchDocuments();
        fetchPortfolios();

        fetchClients();
    }, [projectId, access.canView]);


    const resetForm = () => {
        setFormData({
            id: null, project_id: projectId || '', location: '',
            inspection_date: '', inspection_officer_name_1: '', inspection_officer_role_1: '', inspection_officer_name_2: '', inspection_officer_role_2: '', inspection_description: '', 
            progress_date: '', progress_officer_name_1: '', progress_officer_role_1: '', progress_officer_name_2: '', progress_officer_role_2: '', progress_description: '', 
            handover_date: '', handover_officer_name_1: '', handover_officer_role_1: '', handover_officer_name_2: '', handover_officer_role_2: '', handover_description: '',
            bapp_attachment: createDefaultBappAttachment(portfolios.find(p => String(p.id) === String(projectId || formData.project_id)))
        });
        setPortfolioSearch('');
        setIsProjectDropdownOpen(false);
        setViewMode('table');
    };
    useEffect(() => {
        if (syncBastPihak1) {
            setFormData(prev => ({
                ...prev,
                handover_officer_name_1: prev.progress_officer_name_1 || '',
                handover_officer_role_1: prev.progress_officer_role_1 || '',
            }));
        }
    }, [syncBastPihak1, formData.progress_officer_name_1, formData.progress_officer_role_1]);
    useEffect(() => {
        if (syncBastPihak2) {
            setFormData(prev => ({
                ...prev,
                handover_officer_name_2: prev.progress_officer_name_2 || '',
                handover_officer_role_2: prev.progress_officer_role_2 || '',
            }));
        }
    }, [syncBastPihak2, formData.progress_officer_name_2, formData.progress_officer_role_2]);

    // SESUAIKAN ADD NEW: Reset nilai kolom baru
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentProject({ 
        title: '', client_id: '', description: '', status: 'Pending', date: '', image: null,
        portfolio_value: '', project_name: '', contract_number: '', contract_year: '', 
        contract_start_date: '', contract_end_date: ''
    });
    setSelectedImageFile(null); 
    setIsModalOpen(true);
  };

    const handleEditClick = (item) => {
        const project = portfolios.find(p => String(p.id) === String(item.project_id));
        setFormData({ ...item, bapp_attachment: normalizeBappAttachment(item.bapp_attachment, project) });
        setViewMode('form');
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
        try {
            const response = await fetch(`${PROJECT_DOCUMENT_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) { showNotification("Dokumen Dihapus!", "success"); fetchDocuments(); }
        } catch (error) { showNotification("Gagal menghapus dokumen.", "error"); }
    };

    const handleSaveDocument = async (e) => {
        e.preventDefault();
        if (!formData.project_id) {
            showNotification("Silakan pilih acuan proyek terlebih dahulu.", "error");
            return;
        }
        setIsSaving(true);
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${PROJECT_DOCUMENT_URL}/${formData.id}` : `${PROJECT_DOCUMENT_URL}`;
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, bapp_attachment: serializeBappAttachment(formData.bapp_attachment) })
            });
            if (response.ok) { showNotification("Data dokumen disimpan!", "success"); fetchDocuments(); resetForm(); }
        } catch (error) { showNotification("Gagal menyimpan dokumen.", "error"); }
        finally { setIsSaving(false); }
    };

    const handleUpdateFromPreview = async () => {
        if (!previewLetter.id) return;
        setIsSaving(true);
        try {
            const response = await fetch(`${PROJECT_DOCUMENT_URL}/${previewLetter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewLetter)
            });
            if (response.ok) {
                showNotification("Perubahan deskripsi berhasil disinkronisasi", "success");
                fetchDocuments();
            }
        } catch (error) { showNotification("Gagal sinkronisasi data preview ke server.", "error"); }
        finally { setIsSaving(false); }
    };

    const handleOpenPreview = (item) => {
        setPreviewLetter({ 
            ...item,
            inspection_description: item.inspection_description || '',
            progress_description: item.progress_description || '',
            handover_description: item.handover_description || ''
        });
    };

    // ==========================================
    // PERBAIKAN: PROSES FILTER DATA (MENGGUNAKAN 'documents' & 'portfolios')
    // ==========================================
    const filteredLetters = (documents || []).filter(item => {
        // Menyesuaikan pencarian berdasarkan field Dokumen Proyek (Lokasi atau Nama Petugas)
        const matchesSearch = 
            (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.inspection_officer_name_1 && item.inspection_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.progress_officer_name_1 && item.progress_officer_name_1.toLowerCase().includes(searchTerm.toLowerCase()));

        // Menyesuaikan jika ada filter id project/portofolio tertentu
        const matchesClient = filterClient === '' || String(item.project_id) === String(filterClient);

        return matchesSearch && matchesClient;
    });

    const {
      currentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage,
      currentItems,
      indexOfFirstItem,
      indexOfLastItem,
      totalPages
    } = useTablePagination(filteredLetters);

    useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, filterClient, projectId]);

    // ==========================================
    // FUNGSI UTAMA UNTUK PAGINATION
    // ==========================================
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // ==========================================
    // FUNGSI PEMBANTU (FORMAT TANGGAL & AMBIL NAMA KLIEN)
    // ==========================================
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    const formatTanggalPanjang = (dateString) => {
        if (!dateString) return '';
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(dateString));
    };

    const getClientName = (projectId) => {
        // PERBAIKAN: Mengambil nama dari state 'portfolios' Anda yang asli
        const found = (portfolios || []).find(p => String(p.id) === String(projectId));
        return found ? found.title || found.name : `ID Proyek: ${projectId}`;
    };

    const handlePrintPDF = async () => {
        if (!previewLetter) return;
        setIsGeneratingPDF(true);
        try {
            const pages = document.querySelectorAll(".pdf-page-bundle");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            for (let i = 0; i < pages.length; i++) {
                const pageElement = pages[i];
                
                const clonedPage = pageElement.cloneNode(true);
                clonedPage.style.position = "fixed";
                clonedPage.style.left = "-99999px";
                clonedPage.style.top = "0";
                
                const activeEditors = clonedPage.querySelectorAll('.preview-editable-zone');
                activeEditors.forEach((zone, idx) => {
                    const primaryEditor = pageElement.querySelectorAll('.preview-editable-zone')[idx];
                    const innerHtmlContent = primaryEditor.querySelector('.ql-editor')?.innerHTML || '';
                    
                    const staticContainer = document.createElement('div');
                    staticContainer.className = "static-html-print-output text-[12px] text-justify text-black ql-editor";
                    staticContainer.style.fontFamily = BAPP_FONT;
                    staticContainer.style.lineHeight = docLineSpacing;
                    staticContainer.innerHTML = innerHtmlContent;
                    
                    zone.innerHTML = '';
                    zone.appendChild(staticContainer);
                });

                const toolbars = clonedPage.querySelectorAll('.ql-toolbar');
                toolbars.forEach(tb => tb.remove());

                document.body.appendChild(clonedPage);

                const canvas = await html2canvas(clonedPage, {
                    scale: 2.3, 
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    letterRendering: true,
                    logging: false,
                });

                const imgData = canvas.toDataURL("image/jpeg", 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
                document.body.removeChild(clonedPage);
            }

            pdf.save(`BERKAS_ADMINISTRASI_${previewLetter.id}.pdf`);
            showNotification("PDF Berhasil diunduh!", "success");
        } catch (err) {
            console.error(err);
            showNotification("Gagal memproses cetak PDF.", "error");
        } finally {
            setIsGeneratingPDF(false);
        } 
    };  
    const getProjectTitle = (id) => {
        const found = portfolios.find(p => String(p.id) === String(id));
        return found ? found.title || found.name : `ID Proyek: ${id}`;
    };

 const getHariDanTerbilang = (dateString) => {
    if (!dateString) {
        return {
            hari: "___________",
            tanggalTerbilang: "tanggal ____ bulan __________ tahun _____"
        };
    }

    const dateObj = new Date(dateString);

    const hariArr = [
        "Minggu", "Senin", "Selasa", "Rabu",
        "Kamis", "Jumat", "Sabtu"
    ];

    const bulanArr = [
        "Januari", "Februari", "Maret", "April",
        "Mei", "Juni", "Juli", "Agustus",
        "September", "Oktober", "November", "Desember"
    ];

    // 🔥 helper angka ke kata
    const angkaKata = (num) => {
        const map = [
            "", "Satu", "Dua", "Tiga", "Empat", "Lima",
            "Enam", "Tujuh", "Delapan", "Sembilan"
        ];

        if (num < 10) return map[num];

        if (num < 20) {
            if (num === 10) return "Sepuluh";
            if (num === 11) return "Sebelas";
            return map[num - 10] + " Belas";
        }

        const puluhan = Math.floor(num / 10);
        const satuan = num % 10;

        let hasil = map[puluhan] + " Puluh";
        if (satuan !== 0) hasil += " " + map[satuan];

        return hasil;
    };

    const tanggal = dateObj.getDate();
    const bulan = bulanArr[dateObj.getMonth()];
    const tahun = dateObj.getFullYear();

    // 🔥 format terbilang tahun (2 digit + 4 digit)
    const tahunKata = (() => {
        const ribuan = Math.floor(tahun / 1000);
        const sisa = tahun % 1000;

        let hasil = angkaKata(ribuan) + " Ribu";

        if (sisa > 0) {
            if (sisa < 100) {
                hasil += " " + angkaKata(sisa);
            } else {
                const ratus = Math.floor(sisa / 100);
                hasil += " " + angkaKata(ratus) + " Ratus";
            }
        }

        return hasil;
    })();

    return {
    hari: hariArr[dateObj.getDay()],
    tanggalTerbilang: `tanggal ${angkaKata(tanggal)} bulan ${bulan} tahun ${tahunKata}`,
    tanggalAngka: `${String(tanggal).padStart(2, "0")}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${tahun}`
};
};

    const labelStyle = "block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5";
    const inputStyle = "w-full border border-gray-300 bg-white rounded-xl px-4 py-2 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all";
    const compactInputStyle = "w-full border border-gray-300 bg-white rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition";

    const selectedPortfolio = portfolios.find(p => String(p.id) === String(formData.project_id));
    const bappAttachment = normalizeBappAttachment(formData.bapp_attachment, selectedPortfolio);
    const previewPortfolio = portfolios.find(p => String(p.id) === String(previewLetter ? previewLetter.project_id : ''));
    const previewBappAttachment = useMemo(
        () => previewLetter ? normalizeBappAttachment(previewLetter.bapp_attachment, previewPortfolio) : createDefaultBappAttachment(),
        [previewLetter, previewPortfolio]
    );
    const filteredPortfolios = portfolios.filter(p => 
        `${p.title || p.name || ''} ${p.project_name || ''} ${p.client_name || ''}`
            .toLowerCase()
            .includes(portfolioSearch.toLowerCase())
    );

    const updateBappAttachment = (updater) => setFormData(prev => {
        const project = portfolios.find(p => String(p.id) === String(prev.project_id));
        const current = normalizeBappAttachment(prev.bapp_attachment, project);
        return { ...prev, bapp_attachment: updater(current) };
    });

    const updateBappSection = (sectionIndex, patch) => updateBappAttachment(att => ({
        ...att,
        sections: att.sections.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section)
    }));

    const updateBappItem = (sectionIndex, itemIndex, patch) => updateBappAttachment(att => ({
        ...att,
        sections: att.sections.map((section, sIndex) => sIndex === sectionIndex
            ? {
                ...section,
                items: section.items.map((item, iIndex) => iIndex === itemIndex ? { ...item, ...patch } : item)
            }
            : section)
    }));

    const addBappSection = () => updateBappAttachment(att => ({
        ...att,
        sections: [
            ...att.sections,
            {
                no: `${String.fromCharCode(65 + att.sections.length)}.`,
                title: '',
                items: [{ no: '1', scope: '', result: BAPP_DEFAULT_RESULT, check: BAPP_DEFAULT_CHECK }]
            }
        ]
    }));

    const removeBappSection = (sectionIndex) => updateBappAttachment(att => ({
        ...att,
        sections: att.sections
            .filter((section, index) => index !== sectionIndex)
            .map((section, index) => ({ ...section, no: `${String.fromCharCode(65 + index)}.` }))
    }));

    const addBappItem = (sectionIndex) => updateBappAttachment(att => ({
        ...att,
        sections: att.sections.map((section, index) => index === sectionIndex
            ? {
                ...section,
                items: [...section.items, {
                    no: String(section.items.length + 1),
                    scope: '',
                    result: BAPP_DEFAULT_RESULT,
                    check: BAPP_DEFAULT_CHECK
                }]
            }
            : section)
    }));

    const removeBappItem = (sectionIndex, itemIndex) => updateBappAttachment(att => ({
        ...att,
        sections: att.sections.map((section, sIndex) => sIndex === sectionIndex
            ? {
                ...section,
                items: section.items
                    .filter((item, index) => index !== itemIndex)
                    .map((item, index) => ({ ...item, no: String(index + 1) }))
            }
            : section)
    }));

    const generateBappTemplate = (project) => {
    if (!project) return '';
    const projectTitle = project.title || project.name || '';
    const contractNumber = project.contract_number || project.no_kontrak || '';
    const contractDate = formatTanggalPanjang(project.date);

    return `
        <p>Berdasarkan Surat Pesanan ${projectTitle} Nomor: ${contractNumber} tanggal ${contractDate}</p>
        <p>Dengan ini menerangkan bahwa:</p>
        <p>PIHAK KEDUA menyatakan telah menyelesaikan pekerjaan sesuai ruang lingkup dan deliverables pengadaan ${projectTitle} sesuai dengan Surat Pesanan Nomor: ${contractNumber} tanggal ${contractDate}</p>
        <ul>
            <li>PIHAK PERTAMA menyatakan telah memeriksa hasil pekerjaan dan deliverables dimaksud pada butir 1 dengan hasil Baik dan Sesuai.</li>
            <li>Laporan hasil dan/atau checklist penyelesaian pekerjaan sebagaimana terlampir.</li>
        </ul>
        <p>Demikian Berita Acara Penyelesaian Pekerjaan (BAPP) ${projectTitle} ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
    `;
};

const generateBastTemplate = (project) => {
    if (!project) return '';
    
    // Fallback data proyek dari database
    const projectTitle = project.title || project.name || '[Nama Proyek]';
    const contractNumber = project.contract_number || project.no_kontrak || '[Nomor Kontrak]';
    const contractDate = project.date ? formatDate(project.date) : '[Tanggal Kontrak]';

    return `
        <p>Berdasarkan:</p>
        <ol>
            <li>Kontrak Perjanjian Kerja Sama  ${projectTitle}  Nomor: ${contractNumber} tanggal  ${contractDate}</li> 
            <li>Berita Acara Penyelesaian Pekerjaan (BAPP) ${projectTitle}  Nomor: ${contractNumber}  tanggal ${contractDate} </li>
        </ol>
        <p>Dengan ini menyatakan bahwa:</p>
         
            <p>1.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK KEDUA</strong> menyerahkan seluruh hasil pekerjaan dan deliverables sesuai dengan dokumen tersebut di atas kepada <strong>PIHAK PERTAMA</strong>.
            <p>2.&nbsp;&nbsp;&nbsp;&nbsp;<strong>PIHAK PERTAMA</strong> menerima seluruh hasil pekerjaan dan deliverables sesuai sesuai dengan dokumen tersebut di atas dari <strong>PIHAK KEDUA</strong>.
         
        <p>Demikian Berita Acara Serah Terima Pekerjaan (BAST) <strong>${projectTitle}</strong> ini dibuat dalam rangkap 2 (dua) asli, masing-masing sama bunyinya serta mempunyai kekuatan hukum yang sama setelah ditandatangani kedua belah pihak untuk dipergunakan sebagaimana mestinya.</p>
    `;
};

 const applyProjectSelection = (selectedId) => {
    if (!selectedId || selectedId === "") {
        setFormData(prev => ({
            ...prev,
            project_id: '',
            company_1: '',
            location: '',
            client_name: '',
            progress_description: '',
            handover_description: '',
            bapp_attachment: createDefaultBappAttachment()
        }));
        setPortfolioSearch('');
        setIsProjectDropdownOpen(false);
        return;
    }

    const selectedProj = portfolios.find(p => String(p.id) === String(selectedId));
    const clientNama = selectedProj?.client_name || '';
    const clientAlamat = selectedProj
        ? (selectedProj.client_location || selectedProj.client_address || selectedProj.location || selectedProj.address || '')
        : '';

    // Buat teks HTML template untuk BAPP dan BAST
    const autoBappDescription = selectedProj ? generateBappTemplate(selectedProj) : '';
    const autoBastDescription = selectedProj ? generateBastTemplate(selectedProj) : '';

    // UPDATE SEMUA STATE SEKALIGUS DALAM SATU WAKTU (ONE-SHOT UPDATE)
    setFormData(prev => {
        return {
            ...prev,                      // Pertahankan data lama (termasuk nama petugas, dll)
            project_id: String(selectedId), // Pilih acuan proyek
            company_1: clientNama,
            location: clientAlamat,
            client_name: clientNama,
            progress_description: autoBappDescription, // ISI BAPP (HALAMAN 2)
            handover_description: autoBastDescription,  // ISI BAST (HALAMAN 3)
            bapp_attachment: createDefaultBappAttachment(selectedProj)
        };
    });
    setPortfolioSearch('');
    setIsProjectDropdownOpen(false);
};

const handleProjectChange = (e) => applyProjectSelection(e.target.value);
const handleCopyData = async (item) => {
    if (!window.confirm("Yakin ingin copy data ini?")) return;

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        const copiedData = {
            ...item,

            // 🔥 WAJIB biar jadi data baru
            id: null,

            // optional reset / update
            inspection_date: todayStr,
            progress_date: todayStr,
            handover_date: todayStr,
        };

        const response = await fetch(`${PROJECT_DOCUMENT_URL}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(copiedData)
        });

        if (!response.ok) throw new Error("Copy gagal");

        await fetchDocuments();

        showNotification("Data berhasil disalin!", "success");

    } catch (err) {
        console.error(err);
        showNotification("Gagal copy data", "error");
    }
};

  if (!access.canView) {
    return (
      <div className="app-card app-card-padded text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
        <p className="text-gray-500 text-sm mt-2">Anda tidak memiliki hak akses untuk melihat data ini.</p>
      </div>
    );
  }

    return (
        <div className="app-page" style={{ fontFamily: 'Arial, sans-serif' }}>
            <FeaturePageHeader
                title="Dokumen Proyek"
                subtitle="Kelola dokumen proyek"
                actions={
                    <>
                        <TableExports
                            menuUrl="/internal/project-documents"
                            title="Dokumen Proyek"
                            filename="data-dokumen-proyek"
                            columns={[
                                { label: 'Nomor', key: 'no', width: 1 },
                                { label: 'Proyek', key: 'project', width: 5 },
                                { label: 'Tanggal', key: 'date', width: 3 }
                            ]}
                            rows={currentItems.map((item, index) => ({
                                no: indexOfFirstItem + index + 1,
                                project: getClientName(item.project_id) || '-',
                                date: formatDate(item.inspection_date)
                            }))}
                        />
                        {access.canCreate && (
                            <button
                                onClick={() => { resetForm(); setViewMode('form'); }}
                                className="app-button app-button-primary"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                                </svg>
                                Tambah
                            </button>
                        )}
                    </>
                }
            />
            {/* INJECTOR CSS: MENJAMIN FORMAT ALIGNMENT, LIST BULLET & NUMBERING BERJALAN SEMPURNA */}
            <style>{`
                .ql-container, .ql-editor, .ql-editor p, .ql-editor li { 
                    font-family: Arial, sans-serif !important; 
                    font-size: 14px !important; 
                    color: #000000 !important; 
                }
                .pdf-page-bundle .ql-container, .pdf-page-bundle .ql-editor, .pdf-page-bundle .ql-editor p, .pdf-page-bundle .ql-editor li,
                .static-html-print-output, .static-html-print-output p, .static-html-print-output li { 
                    font-family: Tahoma, sans-serif !important; 
                    font-size: 14px !important; 
                    color: #000000 !important; 
                }
                /* Memaksa text alignment sinkron saat dirender oleh html2canvas */
                .ql-align-justify { text-align: justify !important; }
                .ql-align-center { text-align: center !important; }
                .ql-align-right { text-align: right !important; }
                .ql-align-left { text-align: left !important; }
                
                .preview-editable-zone ol, .static-html-print-output ol { 
                    list-style-type: decimal !important; 
                    padding-left: 20px !important; 
                    margin-top: 4px !important;
                    margin-bottom: 4px !important;
                }
                .preview-editable-zone ul, .static-html-print-output ul { 
                    list-style-type: disc !important; 
                    padding-left: 20px !important; 
                    margin-top: 4px !important;
                    margin-bottom: 4px !important;
                }
                .preview-editable-zone li, .static-html-print-output li { 
                    display: list-item !important;
                    list-style-position: outside !important;
                }
                .preview-editable-zone .ql-toolbar.ql-snow { border: 1px dashed #cbd5e1 !important; background: #f8fafc !important; border-radius: 6px 6px 0 0; padding: 4px !important; }
                .preview-editable-zone .ql-container.ql-snow { border: 1px dashed #cbd5e1 !important; border-top: none !important; border-radius: 0 0 6px 6px; background: #fff; }
                .preview-editable-zone .ql-editor { min-height: 90px !important; padding: 8px 12px !important; }
            `}</style>

           
            {/* Toast Notifikasi Dinamis */}
            {notification.show && (
                <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'} bg-white text-gray-800`}>
                    <div className="text-sm font-bold">{notification.message}</div>
                </div>
            )}
  
            {/* 1. HALAMAN TABEL UTAMA */}
            {viewMode === 'table' && (() => {
                return (
                <div className="app-page">
                    {/* Filter & Search Bar Section */}
                    <div className="app-card app-card-padded">
                        <h2 className="mb-4 text-sm font-bold text-slate-800">Filter Dokumen Proyek</h2>
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
                        <div className="relative w-full md:flex-1">
                            <input 
                                type="text" 
                                placeholder="Cari lokasi, petugas inspeksi, atau petugas progres..." 
                                className="app-input pl-9" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </div>
                        
                        <select 
                            className="w-full md:w-64 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer focus:border-indigo-500 transition" 
                            value={filterClient} 
                            onChange={(e) => setFilterClient(e.target.value)}
                        >
                            <option value="">Semua Proyek / Portofolio</option>
                            {portfolios.map(p => (<option key={p.id} value={p.id}>{p.title || p.name}</option>))}
                        </select>
                        
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterType('');
                                setFilterClient('');
                                fetchDocuments();
                                fetchPortfolios();
                            }}
                            title="Muat Ulang Data & Atur Ulang Filter"
                            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            <Icons.RefreshCw className="w-4 h-4" />
                            Muat Ulang Data
                        </button>
                        </div>
                    </div>

                    {filteredLetters.length > 0 ? (
                        <>
                            {/* TAMPILAN MOBILE LIST (KARTU) */}
                            <div className="block md:hidden space-y-3">
                                {currentItems.map((item, index) => (
                                    <div key={item.id} className="p-4 bg-white app-card app-card-padded hover:border-indigo-100 transition relative overflow-hidden">
                                        {/* Indikator Nomor Otomatis */}
                                        <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-gray-200/60">
                                            #{indexOfFirstItem + index + 1}
                                        </div>

                                        <div className="flex justify-between items-start gap-2 mb-2 pr-6">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-700/10">
                                                DOKUMEN PROYEK
                                            </span>
                                            <span className="text-xs text-gray-400">{formatDate(item.inspection_date || item.progress_date || item.handover_date)}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm break-all">{item.location || 'Lokasi tidak ditentukan'}</h3>
                                        
                                        <div className="text-xs border-t border-gray-50 pt-2 text-gray-600 space-y-0.5 mt-2">
                                            <div><span className="text-gray-400">Petugas 1:</span> <span className="font-medium text-gray-800">{item.inspection_officer_name_1 || '-'}</span></div>
                                            <div><span className="text-gray-400">Proyek:</span> {getClientName(item.project_id)}</div>
                                        </div>
                                        
                                        {/* Tombol Aksi Mobile */}
                                        <div className="flex justify-end gap-2 mt-3 border-t border-gray-100 pt-3">
                                            {access.canCreate && (
                                            <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="py-2 px-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-emerald-100">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg>
                                                <span>Lihat</span>
                                            </button>
                                            )}
                                            {access.canEdit && (
                                            <button onClick={() => handleCopyData(item)} title="Salin Data" className="py-2 px-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-amber-100"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Z"/></svg><span>Salin</span></button>
                                            )}
                                            {access.canEdit && (
                                            <button onClick={() => handleEditClick(item)} title="Ubah Data" className="py-2 px-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition flex-1 flex items-center justify-center gap-1 border border-indigo-100">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>
                                                <span>Ubah</span>
                                            </button>
                                            )}
                                            {access.canDelete && (
                                            <button onClick={() => handleDeleteClick(item.id)} title="Hapus Dokumen" className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100 flex items-center justify-center">
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* TAMPILAN DESKTOP TABLE */}
                            <div className="hidden md:block app-table-shell">
                                <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 border-b border-gray-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <tr> 
                                        <th className="py-4 px-4 w-12 text-center">No</th> 
                                        <th className="py-4 px-4">Proyek</th> 
                                        <th className="py-4 px-4">Tanggal</th>
                                        <th className="py-4 pr-6 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group"> 
                                        <td className="py-4 px-4 text-center text-xs font-semibold text-gray-400">
                                            {indexOfFirstItem + index + 1}
                                        </td> 
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium text-gray-900">{getClientName(item.project_id)}</span> 

                                                <span className="text-[11px] text-gray-400 italic">{item.location || '-'}</span>
                                            </div>
                                        </td> 
                                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(item.inspection_date)}</td>
                                        <td className="py-4 pr-6 text-right space-x-1">
                                           
                                            {access.canCreate && (
                                                <button onClick={() => handleOpenPreview(item)} title="Pratinjau PDF" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition inline-flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0 160q-139 0-251.5-76.5T40-500q61-125 173.5-201.5T480-778q139 0 251.5 76.5T920-500q-61 125-173.5 201.5T480-240Z"/></svg>
                                                </button>
                                            )}
                                            {access.canEdit && (
                                            <button onClick={() => handleCopyData(item)} title="Salin Data" className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition inline-flex items-center justify-center"><svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Z"/></svg></button>
                                            )}
                                            {/* TOMBOL EDIT */}
                                            {access.canEdit && (
                                                <button onClick={() => handleEditClick(item)} title="Ubah Data" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition inline-flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>
                                                </button>
                                            )}
                                            {/* TOMBOL DELETE */}
                                            {access.canDelete && (
                                                <button onClick={() => handleDeleteClick(item.id)} title="Hapus Dokumen" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition inline-flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 app-pagination">
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <PageSizeSelect value={itemsPerPage} onChange={setItemsPerPage} />
                                    <div className="text-sm text-gray-500"> 
                                        dari <span className="font-semibold text-gray-700">{filteredLetters.length}</span> records
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Tombol Previous */}
                                    <button
                                        onClick={() => typeof paginate === 'function' && paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                            currentPage === 1
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                                        }`}
                                    >
                                        Sebelumnya
                                    </button>

                                    {/* Loop Angka Page Number */}
                                    {Array.from({ length: totalPages }, (_, index) => {
                                        const pageNum = index + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => typeof paginate === 'function' && paginate(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    {/* Tombol Next */}
                                    <button
                                        onClick={() => typeof paginate === 'function' && paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                            currentPage === totalPages
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-95'
                                        }`}
                                    >
                                        Berikutnya
                                    </button>
                                 </div>
                             </div>
                         </>
                     ) : (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-white">
                            Tidak ada berkas data dokumen ditemukan
                        </div>
                    )}
                 </div>
                );
            })()}

            {/* VIEW MODE: INPUT FORM UTAMA */}
         {viewMode === 'form' && (
                <div className="app-card app-card-padded mx-auto my-6">
                    <div className="flex justify-between items-center pb-6 border-b border-gray-100 mb-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                            {formData.id ? '✏️ Perbarui Dokumen Administrasi Proyek' : '➕ Buat Dokumen Administrasi Baru'}
                        </h3> 
                    </div>
                    <form onSubmit={handleSaveDocument} className="space-y-5">
                        
                        {/* ====== KELOMPOK DATA UTAMA & PERUSAHAAN ====== */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4">
                            <span className="text-xs font-bold text-slate-700 block tracking-wider uppercase">📍 Informasi Umum & Instansi/Perusahaan</span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelStyle}>Pilih Acuan Proyek</label>
                                    <div className="relative" ref={projectDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsProjectDropdownOpen(prev => !prev)}
                                            aria-haspopup="listbox"
                                            aria-expanded={isProjectDropdownOpen}
                                            className={`${inputStyle} flex items-center justify-between gap-3 text-left cursor-pointer ${formData.project_id ? 'text-gray-800' : 'text-gray-400'}`}
                                        >
                                            <span className="truncate">
                                                {selectedPortfolio
                                                    ? `${selectedPortfolio.title || selectedPortfolio.name || ''}${selectedPortfolio.client_name ? ` (${selectedPortfolio.client_name})` : ''}`
                                                    : '-- Pilih Portofolio Proyek --'}
                                            </span>
                                            <svg className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {isProjectDropdownOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                                <div className="p-2 border-b border-gray-100">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="Cari proyek..."
                                                            className="w-full border border-gray-200 bg-gray-50 text-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition placeholder-gray-400"
                                                            value={portfolioSearch}
                                                            onChange={(e) => setPortfolioSearch(e.target.value)}
                                                        />
                                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                                    </div>
                                                </div>
                                                <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                                                    {filteredPortfolios.length === 0 ? (
                                                        <li className="px-3 py-2 text-xs text-gray-500 italic">Tidak ada proyek ditemukan.</li>
                                                    ) : filteredPortfolios.map(p => {
                                                        const isSelected = String(formData.project_id) === String(p.id);
                                                        return (
                                                            <li key={p.id} role="option" aria-selected={isSelected}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => applyProjectSelection(p.id)}
                                                                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 ${
                                                                        isSelected
                                                                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                                            : 'text-gray-700 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    <span className="truncate">
                                                                        {p.title || p.name} {p.client_name ? `(${p.client_name})` : ''}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Select tersembunyi untuk validasi form bawaan browser */}
                                        <select
                                            value={formData.project_id ? String(formData.project_id) : ''}
                                            onChange={handleProjectChange}
                                            required
                                            tabIndex={-1}
                                            className="sr-only"
                                        >
                                            <option value="">-- Pilih Portofolio Proyek --</option>
                                            {portfolios.map(p => (
                                                <option key={p.id} value={String(p.id)}>
                                                    {p.title || p.name} {p.client_name ? `(${p.client_name})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {portfolioSearch && (
                                        <button type="button" onClick={() => setPortfolioSearch('')} className="text-[10px] text-red-500 hover:underline block">❌ Reset Pencarian</button>
                                    )}
                                </div>

                                <div>
                                    <label className={labelStyle}>Tempat Pelaksanaan Berita Acara</label>
                                    <input type="text" className={inputStyle} value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} required placeholder="Lokasi pelaksanaan..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                                <div>
                                    <label className={labelStyle}>Nama Perusahaan / Instansi (PIHAK I)</label>
                                    <input type="text" className={inputStyle} value={formData.company_1 || ''} onChange={(e) => setFormData({...formData, company_1: e.target.value})} required placeholder="Contoh: Dana Pensiun Telkom" />
                                </div>
                                <div>
                                    <label className={labelStyle}>Nama Perusahaan / Instansi (PIHAK II)</label>
                                    <input type="text" className={inputStyle} value={formData.company_2 || ''} onChange={(e) => setFormData({...formData, company_2: e.target.value})} required placeholder="Contoh: PT. Crop Inspirasi Digital" />
                                </div>
                            </div>
                        </div>

                        {/* ====== SECTION 1: BAP ====== */}
                        <div className="border border-amber-200 rounded-xl p-5 space-y-5 bg-amber-50/5 shadow-sm">
                            <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide border-b border-amber-100 pb-2">Halaman 1: Berita Acara Pemeriksaan Pekerjaan (BAP)</h4>
                            <div className="w-full md:w-1/3">
                                <label className={labelStyle}>Tanggal Pelaksanaan BAP</label>
                                <input type="date" className={inputStyle} value={formData.inspection_date} onChange={(e) => setFormData({...formData, inspection_date: e.target.value})} required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center border-b pb-1"><span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span></div>
                                    <div><label className={labelStyle}>Nama Petugas / Wakil</label><input type="text" className={inputStyle} value={formData.inspection_officer_name_1 || ''} onChange={(e) => setFormData({...formData, inspection_officer_name_1: e.target.value})} required placeholder="Nama Lengkap Pihak I" /></div>
                                    <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.inspection_officer_role_1 || ''} onChange={(e) => setFormData({...formData, inspection_officer_role_1: e.target.value})} required placeholder="Manajer Proyek" /></div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center border-b pb-1"><span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span></div>
                                    <div><label className={labelStyle}>Nama Petugas / Wakil</label><input type="text" className={inputStyle} value={formData.inspection_officer_name_2 || ''} onChange={(e) => setFormData({...formData, inspection_officer_name_2: e.target.value})} required placeholder="Nama Lengkap Pihak II" /></div>
                                    <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.inspection_officer_role_2 || ''} onChange={(e) => setFormData({...formData, inspection_officer_role_2: e.target.value})} required placeholder="Supervisor" /></div>
                                </div>
                            </div>
 
            <div className="flex justify-between items-center border-b pb-2">
                <label className={labelStyle}>Deskripsi Hasil Pemeriksaan BAP</label>
                
                {/* TOMBOL TOGGLE UNTUK BERGANTI MODE VISUAL <=> HTML */}
                <button
                    type="button"
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                        isHtmlMode 
                        ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                >
                    {isHtmlMode ? '👁️ Lihat Mode Visual' : '💻 Edit Kode HTML (<>)'}
                </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {isHtmlMode ? (
                    /* ====== JIKA MODE HTML AKTIF: TAMPILKAN TEXTAREA MENTAH ====== */
                    <textarea
                        className="w-full h-[250px] p-4 font-mono text-xs text-indigo-900 bg-slate-50 outline-none focus:bg-white transition leading-relaxed block"
                        value={formData.inspection_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, inspection_description: e.target.value }))}
                        placeholder="Masukkan atau edit tag HTML di sini..."
                    />
                ) : (
                    /* ====== JIKA MODE VISUAL AKTIF: TAMPILKAN TEXTEDITOR BIASA ====== */
                    <ReactQuill 
                        theme="snow" 
                        modules={formQuillModules} 
                        value={formData.inspection_description || ''} 
                        onChange={(content) => setFormData(prev => ({ ...prev, inspection_description: content }))} 
                        placeholder="Ketik di sini..."
                    />
                )}
            </div>
 
                        </div>

                        {/* ====== SECTION 2: BAPP ====== */}
                        <div className={`border rounded-xl p-5 space-y-5 transition-all duration-200 shadow-sm ${Number(formData.progress_status) === 1 ? 'border-blue-200 bg-blue-50/5' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wide ${Number(formData.progress_status) === 1 ? 'text-blue-800' : 'text-gray-400'}`}>Halaman 2: Berita Acara Penyelesaian Pekerjaan (BAPP)</h4>
                                </div>
                                {access.canEdit && (
                                <button type="button" onClick={() => setFormData({...formData, progress_status: Number(formData.progress_status) === 1 ? 0 : 1})} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${Number(formData.progress_status) === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {Number(formData.progress_status) === 1 ? '🟢 BAPP Aktif' : '❌ BAPP Non-Aktif'}
                                </button>
                                )}
                            </div>
                            
                            {Number(formData.progress_status) === 1 ? (
                                <div className="space-y-5">
                                    <div className="w-full md:w-1/3">
                                        <label className={labelStyle}>Tanggal Pelaksanaan BAPP</label>
                                        <input type="date" className={inputStyle} value={formData.progress_date || ''} onChange={(e) => setFormData({...formData, progress_date: e.target.value})} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Pihak I BAPP */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span>
                                                <label className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer text-[10px] font-semibold text-blue-700">
                                                    {/* <input type="checkbox" className="rounded text-blue-600 w-3 h-3" checked={syncBappPihak1} onChange={(e) => setSyncBappPihak1(e.target.checked)} /> */}
                                                    <input
                                                        type="checkbox"
                                                        className="rounded text-blue-600 w-3 h-3"
                                                        checked={syncBappPihak1}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSyncBappPihak1(checked);

                                                            if (checked) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    progress_officer_name_1: prev.inspection_officer_name_1,
                                                                    progress_officer_role_1: prev.inspection_officer_role_1,
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    <span>Sama dengan BAP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.progress_officer_name_1 || ''} onChange={(e) => setFormData({...formData, progress_officer_name_1: e.target.value})} disabled={syncBappPihak1} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.progress_officer_role_1 || ''} onChange={(e) => setFormData({...formData, progress_officer_role_1: e.target.value})} disabled={syncBappPihak1} required /></div>
                                        </div>

                                        {/* Pihak II BAPP */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span>
                                                <label className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer text-[10px] font-semibold text-blue-700">
                                                    <input type="checkbox" className="rounded text-blue-600 w-3 h-3" checked={syncBappPihak2} onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSyncBappPihak2(checked);

                                                        if (checked) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                progress_officer_name_2: prev.inspection_officer_name_2,
                                                                progress_officer_role_2: prev.inspection_officer_role_2,
                                                            }));
                                                        }
                                                    }} />
                                                    <span>Sama dengan BAP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.progress_officer_name_2 || ''} onChange={(e) => setFormData({...formData, progress_officer_name_2: e.target.value})} disabled={syncBappPihak2} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.progress_officer_role_2 || ''} onChange={(e) => setFormData({...formData, progress_officer_role_2: e.target.value})} disabled={syncBappPihak2} required /></div>
                                        </div>
                                    </div>

                                    {/* TEXT EDITOR BAPP */}
                                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between gap-3 px-2 pt-1">
                                            <label className={labelStyle}>Deskripsi Kemajuan Pekerjaan BAPP</label>
                                            <button 
                                                type="button" 
                                                disabled={!selectedPortfolio}
                                                onClick={() => setFormData(prev => ({ ...prev, progress_description: generateBappTemplate(selectedPortfolio) }))}
                                                className="mb-1.5 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Terapkan Format BAPP 2026
                                            </button>
                                        </div>
                                        <ReactQuill 
                                            theme="snow" 
                                            modules={formQuillModules} 
                                            value={formData.progress_description || ''} 
                                            onChange={(content) => setFormData(prev => ({ ...prev, progress_description: content }))} 
                                        />
                                    </div>

                                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div>
                                                <label className={labelStyle}>Judul Lampiran</label>
                                                <input type="text" className={compactInputStyle} value={bappAttachment.title} onChange={(e) => updateBappAttachment(att => ({ ...att, title: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Judul Proyek Lampiran</label>
                                                <input type="text" className={compactInputStyle} value={bappAttachment.project_title} onChange={(e) => updateBappAttachment(att => ({ ...att, project_title: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Link Evidence</label>
                                                <input type="text" className={compactInputStyle} value={bappAttachment.evidence_url} onChange={(e) => updateBappAttachment(att => ({ ...att, evidence_url: e.target.value }))} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Deliverables Lampiran BAPP</span>
                                            <div className="flex gap-1.5">
                                                <button type="button" disabled={!selectedPortfolio} onClick={() => setFormData(prev => ({ ...prev, bapp_attachment: createDefaultBappAttachment(selectedPortfolio) }))} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Pulihkan Default</button>
                                                <button type="button" onClick={addBappSection} className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100">+ Tambah Bagian</button>
                                            </div>
                                        </div>

                                        {bappAttachment.sections.map((section, sectionIndex) => (
                                            <div key={sectionIndex} className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/60">
                                                <div className="flex gap-1.5 items-center">
                                                    <input type="text" className={`${compactInputStyle} w-14 text-center font-bold`} value={section.no} onChange={(e) => updateBappSection(sectionIndex, { no: e.target.value })} />
                                                    <input type="text" className={compactInputStyle} value={section.title} onChange={(e) => updateBappSection(sectionIndex, { title: e.target.value })} placeholder="Nama bagian / lingkup pekerjaan" />
                                                    <button type="button" onClick={() => removeBappSection(sectionIndex)} className="shrink-0 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-[10px] font-bold text-rose-700 hover:bg-rose-100">Hapus</button>
                                                </div>

                                                <div className="grid grid-cols-[36px_minmax(0,1fr)_100px_minmax(0,1fr)_28px] gap-1.5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Nomor</span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Lingkup & Hasil Penyerahan</span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Hasil PIHAK II</span>
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Hasil PIHAK I</span>
                                                    <span></span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    {section.items.map((item, itemIndex) => (
                                                        <div key={itemIndex} className="grid grid-cols-[36px_minmax(0,1fr)_100px_minmax(0,1fr)_28px] gap-1.5">
                                                            <input type="text" className={`${compactInputStyle} text-center`} value={item.no} onChange={(e) => updateBappItem(sectionIndex, itemIndex, { no: e.target.value })} />
                                                            <textarea rows="2" className={`${compactInputStyle} resize-y`} value={item.scope} onChange={(e) => updateBappItem(sectionIndex, itemIndex, { scope: e.target.value })} placeholder="Uraian pekerjaan..." />
                                                            <input type="text" className={compactInputStyle} value={item.result} onChange={(e) => updateBappItem(sectionIndex, itemIndex, { result: e.target.value })} />
                                                            <input type="text" className={compactInputStyle} value={item.check} onChange={(e) => updateBappItem(sectionIndex, itemIndex, { check: e.target.value })} />
                                                            <button type="button" onClick={() => removeBappItem(sectionIndex, itemIndex)} className="px-1 py-1 rounded-lg border border-rose-200 bg-white text-[10px] font-bold text-rose-700 hover:bg-rose-50">x</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addBappItem(sectionIndex)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50">+ Tambah Baris</button>
                                                </div>
                                            </div>
                                        ))}

                                        {bappAttachment.sections.length === 0 && (
                                            <p className="text-xs text-gray-500 italic text-center py-2">Belum ada bagian lampiran. Klik "+ Tambah Bagian" untuk membuat.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100/70 text-center py-4 px-4 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-xs font-medium text-gray-500">📄 Berkas halaman BAPP dinonaktifkan.</p>
                                </div>
                            )}
                        </div>

                        {/* ====== SECTION 3: BAST ====== */}
                        <div className={`border rounded-xl p-5 space-y-5 transition-all duration-200 shadow-sm ${Number(formData.handover_status) === 1 ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wide ${Number(formData.handover_status) === 1 ? 'text-emerald-800' : 'text-gray-400'}`}>Halaman 3: Berita Acara Serah Terima Pekerjaan (BAST)</h4>
                                </div>
                                {access.canEdit && (
                                <button type="button" onClick={() => setFormData({...formData, handover_status: Number(formData.handover_status) === 1 ? 0 : 1})} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${Number(formData.handover_status) === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {Number(formData.handover_status) === 1 ? '🟢 BAST Aktif' : '❌ BAST Non-Aktif'}
                                </button>
                                )}
                            </div>
                            
                            {Number(formData.handover_status) === 1 ? (
                                <div className="space-y-5">
                                    <div className="w-full md:w-1/3">
                                        <label className={labelStyle}>Tanggal Pelaksanaan BAST</label>
                                        <input type="date" className={inputStyle} value={formData.handover_date || ''} onChange={(e) => setFormData({...formData, handover_date: e.target.value})} required />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Pihak I BAST */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK PERTAMA (I)</span>
                                                <label className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer text-[10px] font-semibold text-emerald-700">
                                                    <input type="checkbox" className="rounded text-emerald-600 w-3 h-3" checked={syncBastPihak1} onChange={(e) => setSyncBastPihak1(e.target.checked)} />
                                                    <span>Sama dengan BAPP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.handover_officer_name_1 || ''} onChange={(e) => setFormData({...formData, handover_officer_name_1: e.target.value})} disabled={syncBastPihak1} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.handover_officer_role_1 || ''} onChange={(e) => setFormData({...formData, handover_officer_role_1: e.target.value})} disabled={syncBastPihak1} required /></div>
                                        </div>

                                        {/* Pihak II BAST */} 
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b pb-1 gap-2">
                                                <span className="text-xs font-bold text-gray-700">👤 PIHAK KEDUA (II)</span>
                                                <label className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer text-[10px] font-semibold text-emerald-700">
                                                    <input type="checkbox" className="rounded text-emerald-600 w-3 h-3" checked={syncBastPihak2} onChange={(e) => setSyncBastPihak2(e.target.checked)} />
                                                    <span>Sama dengan BAPP</span>
                                                </label>
                                            </div>
                                            <div><label className={labelStyle}>Nama Petugas</label><input type="text" className={inputStyle} value={formData.handover_officer_name_2 || ''} onChange={(e) => setFormData({...formData, handover_officer_name_2: e.target.value})} disabled={syncBastPihak2} required /></div>
                                            <div><label className={labelStyle}>Jabatan</label><input type="text" className={inputStyle} value={formData.handover_officer_role_2 || ''} onChange={(e) => setFormData({...formData, handover_officer_role_2: e.target.value})} disabled={syncBastPihak2} required /></div>
                                        </div>
                                    </div>

                                    {/* TEXT EDITOR BAST */}
                                    <div className="bg-white p-2 rounded-xl border border-gray-200">
                                        <label className={labelStyle}>Deskripsi Serah Terima BAST</label>
                                        <ReactQuill 
                                            theme="snow" 
                                            modules={formQuillModules} 
                                            value={formData.handover_description || ''} 
                                            onChange={(content) => setFormData(prev => ({ ...prev, handover_description: content }))} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100/70 text-center py-4 px-4 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-xs font-medium text-gray-500">📄 Berkas halaman BAST dinonaktifkan.</p>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => { resetForm(); }} className="app-button">Batal</button>
                            {(formData.id ? access.canEdit : access.canCreate) && (
                            <button type="submit" disabled={isSaving} className="app-button app-button-primary">
                                {isSaving ? '⏳ Menyimpan...' : 'Simpan'}
                            </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

        {/* PREVIEW CONTAINER MODAL */}
        {previewLetter && access.canCreate && (() => {

            const getPreviewPortfolio = () => portfolios.find(p => String(p.id) === String(previewLetter.project_id));

            const renderBappPihak = (nama, jabatan, perusahaan, labelPihak) => (
                <div className="grid grid-cols-[26px_1fr] items-start" style={{ fontFamily: BAPP_FONT, fontSize: '10.5pt', lineHeight: docLineSpacing }}>
                    <div className="font-bold">{labelPihak === 'PERTAMA' ? 'I.' : 'II.'}</div>
                    <div>
                        <table className="w-full border-collapse py-0" style={{ fontFamily: BAPP_FONT, fontSize: '10.5pt' }}>
                            <tbody>
                                <tr><td className="w-[75px] py-0.5">Nama</td><td className="w-[16px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{nama || '-'}</td></tr>
                                <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{jabatan || '-'}</td></tr>
                                <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{perusahaan || '-'}</td></tr>
                            </tbody>
                        </table>
                        <div className="mt-0.5">selanjutnya disebut sebagai <strong>PIHAK {labelPihak},</strong></div>
                    </div>
                </div>
            );

            const renderBappSignature = (p1Nama, p1Jabacy, p2Nama, p2Jabacy) => (
                <table className="w-full border-collapse mt-4" style={{ fontFamily: BAPP_FONT, fontSize: '10.5pt' }}>
                    <tbody>
                        <tr>
                            <td className="w-1/2 align-top text-center pt-2 pb-2">
                                <p className="font-bold">PIHAK PERTAMA</p>
                                <div style={{ height: '80px' }}></div>
                                <p className="font-bold underline">{p1Nama || '____________________'}</p>
                                <p className="font-bold">{p1Jabacy || '-'}</p>
                            </td>
                            <td className="w-1/2 align-top text-center pt-2 pb-2">
                                <p className="font-bold">PIHAK KEDUA</p>
                                <div style={{ height: '80px' }}></div>
                                <p className="font-bold underline">{p2Nama || '____________________'}</p>
                                <p className="font-bold">{p2Jabacy || '-'}</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );

            const renderLembarHalaman = (judulDokumen, tglDokumen, p1Nama, p1Jabacy, p2Nama, p2Jabacy, isiDeskripsiText, fieldKeyName, hasMeterai, docLabel, pageNumber, totalPages) => {
                const { hari, tanggalTerbilang, tanggalAngka } = getHariDanTerbilang(tglDokumen);
                const isBapp = judulDokumen.includes('PENYELESAIAN');
                return (
                    /* Mengubah penataan halaman menjadi flex flex-col justify-start agar posisi TTD naik mengikuti isi teks */
                   <div
                        className="pdf-page-bundle bg-white text-black shrink-0 relative flex flex-col justify-start mb-0"
                        style={{
                            width: "794px",
                            height: "1122px",
                            boxSizing: "border-box",
                            fontFamily: BAPP_FONT,
                            padding: "44px 78px 48px"
                        }}
                        
                    >
                        {/* <img src={`${window.location.origin}/crop2026.png`} crossOrigin="anonymous" className="absolute top-0 left-0 w-[794px] h-[1122px] z-0 pointer-events-none select-none" alt="Kop Surat" /> */}
                        
                        <div className="relative z-10 flex-1 flex flex-col justify-start"    style={{
                                width: "100%", 
                                height: "100%", 
                         
                                margin: "auto",

                                border: "none",
                                boxSizing: "border-box",

                                // padding harus sama semua sisi
                                padding: "0",

                                display: "flex",
                                flexDirection: "column"
                            }}>
                            <div>
                                {/* JUDUL: Tepat diset ke 14px (text-[14px]) */}
                                <div className="text-center mb-3 flex flex-col items-center">
                                    <h2 className="font-bold uppercase leading-tight" style={{ fontFamily: BAPP_FONT, fontSize: '10.5pt' }}>
                                        {judulDokumen}
                                    </h2>
                                    <h3 className="font-bold uppercase leading-tight mt-1" style={{ fontFamily: BAPP_FONT, fontSize: '10.5pt' }}>
                                        {getProjectTitle(previewLetter.project_id)}
                                    </h3>
                                    <div className="w-full border-b-[3px] border-double border-black mt-2 mb-1"></div>
                                </div>

                                {/* PEMBUKA */}
                                <div className="text-justify mb-4" style={{ lineHeight: docLineSpacing, fontFamily: BAPP_FONT, fontSize: isBapp ? '10.5pt' : '14px' }}>
                                    Pada hari ini {hari}, {tanggalTerbilang}  ({tanggalAngka}) bertempat di {previewLetter.location || "____________________"}, kami yang bertandatangan di bawah ini:
                                </div>

                                {/* IDENTITAS PIHAK */}
                                {isBapp ? (
                                    <div className="space-y-2 mb-4">
                                        {renderBappPihak(p1Nama, p1Jabacy, previewLetter.company_1, 'PERTAMA')}
                                        {renderBappPihak(p2Nama, p2Jabacy, previewLetter.company_2, 'KEDUA')}
                                    </div>
                                ) : (
                                    <div className="text-[14px] space-y-3 mb-4" style={{ lineHeight: docLineSpacing, fontFamily: BAPP_FONT }}>
                                        <div className="grid grid-cols-[30px_1fr] items-start">
                                            <div className="font-bold">I.</div>
                                            <div>
                                                <table className="text-[14px] border-collapse py-0" style={{ fontFamily: BAPP_FONT }}>
                                                    <tbody>
                                                        <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p1Nama || '-'}</td></tr>
                                                        <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p1Jabacy || '-'}</td></tr>
                                                        <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{ previewLetter.company_1 || '-'}</td></tr>
                                                    </tbody>
                                                </table>
                                                <div className="mt-0.5 text-gray-950">selanjutnya disebut sebagai <span className="font-bold">PIHAK PERTAMA,</span></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-[30px_1fr] items-start pt-0.5">
                                            <div className="font-bold">II.</div>
                                            <div>
                                                <table className="text-[14px] border-collapse py-0" style={{ fontFamily: BAPP_FONT }}>
                                                    <tbody>
                                                        <tr><td className="w-[85px] py-0.5">Nama</td><td className="w-[20px] text-center py-0.5">:</td><td className="font-semibold py-0.5">{p2Nama || '-'}</td></tr>
                                                        <tr><td className="py-0.5">Jabatan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{p2Jabacy || '-'}</td></tr>
                                                        <tr><td className="py-0.5">Perusahaan</td><td className="text-center py-0.5">:</td><td className="py-0.5">{ previewLetter.company_2 || '-'}</td></tr>
                                                    </tbody>
                                                </table>
                                                <div className="mt-0.5 text-gray-950">selanjutnya disebut sebagai <span className="font-bold">PIHAK KEDUA,</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* AREA EDITOR AKTIF DI PREVIEW: Mendukung formatting alignment penuh */}
                                <div className="mt-3 leading-normal" style={{ fontFamily: BAPP_FONT, fontSize: isBapp ? '10.5pt' : '12px' }}>
                                    <div className="preview-editable-zone" style={{ lineHeight: docLineSpacing, fontFamily: BAPP_FONT, fontSize: isBapp ? '10.5pt' : undefined }}>
                                        <ReactQuill 
                                            theme="snow"
                                            modules={previewQuillModules}
                                            readOnly={false}
                                            value={isiDeskripsiText}
                                            onChange={(content) => setPreviewLetter(prev => ({ ...prev, [fieldKeyName]: content }))}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* TANDA TANGAN: Menggunakan margin kecil agar merapat di bawah penutup */}
                            {isBapp ? (
                                renderBappSignature(p1Nama, p1Jabacy, p2Nama, p2Jabacy)
                            ) : (
                                <div className="grid grid-cols-2 text-center text-[14px] pt-1 mt-2" style={{ fontFamily: BAPP_FONT }}>
                                    <div className="flex flex-col justify-between items-center h-[150px]">
                                        <p className="font-bold uppercase">PIHAK PERTAMA</p>
                                        <div>
                                            <p className="font-bold text-gray-900 underline">{p1Nama || "____________________"}</p>
                                            <p className="text-[14px] text-gray-600 mt-0.5">{p1Jabacy || "Jabatan Pihak I"}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between items-center h-[150px] relative">
                                        <p className="font-bold uppercase">PIHAK KEDUA</p>
                                    
                                        <div>
                                            <p className="font-bold text-gray-900 underline">{p2Nama || "____________________"}</p>
                                            <p className="text-[14px] text-gray-600 mt-0.5">{p2Jabacy || "Jabatan Pihak II"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DocPageFooter
                            label={docLabel}
                            projectTitle={getProjectTitle(previewLetter.project_id)}
                            pageNumber={pageNumber}
                            totalPages={totalPages}
                        />
                    </div>
                );
            };

            const bappLampiranProjectTitle = previewBappAttachment.project_title || getProjectTitle(previewLetter.project_id);
            const bappLampiranContractNumber = getPreviewPortfolio()?.contract_number || getPreviewPortfolio()?.no_kontrak || '';
            const bappLampiranContractDate = formatTanggalPanjang(getPreviewPortfolio()?.date);

            // Hitung total halaman yang aktif untuk teks di badge info panel kanan
            const totalPages =
                1 +
                (Number(previewLetter.progress_status) === 1 ? 1 + lampiranPageCount : 0) +
                (Number(previewLetter.handover_status) === 1 ? 1 : 0);
            const bappDocTotalPages = 1 + lampiranPageCount;

            return (
                <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* SCREEN PREVIEW KIRI */}
                    <div className="flex-1 bg-slate-950 p-4 lg:p-8 overflow-y-auto flex flex-col items-center gap-2">
                        
                        {/* Lembar BAP (Selalu muncul karena tidak dinonaktifkan) */}
                        <div className="text-white text-xs font-mono uppercase bg-amber-600/20 px-4 py-1.5 rounded-full mb-2 border border-amber-500/30">Lembar 1: (BAP)</div>
                        {renderLembarHalaman(
                            "BERITA ACARA PEKERJAAN",
                            previewLetter.inspection_date,
                            previewLetter.inspection_officer_name_1, previewLetter.inspection_officer_role_1,
                            previewLetter.inspection_officer_name_2, previewLetter.inspection_officer_role_2,
                            previewLetter.inspection_description, "inspection_description", false, 'BAP', 1, 1
                        )}

                        {/* Lembar BAPP (Hanya di-render jika progress_status aktif) */}
                        {Number(previewLetter.progress_status) === 1 && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-blue-600/20 px-4 py-1.5 rounded-full my-4 border border-blue-500/30">Lembar berikutnya: (BAPP)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA PENYELESAIAN PEKERJAAN (BAPP)",
                                    previewLetter.progress_date,
                                    previewLetter.progress_officer_name_1, previewLetter.progress_officer_role_1,
                                    previewLetter.progress_officer_name_2, previewLetter.progress_officer_role_2,
                                    previewLetter.progress_description, "progress_description", false, 'BAPP', 1, bappDocTotalPages
                                )}
                                <BappLampiranPages
                                    attachment={previewBappAttachment}
                                    projectTitle={bappLampiranProjectTitle}
                                    contractNumber={bappLampiranContractNumber}
                                    contractDate={bappLampiranContractDate}
                                    lineHeight={docLineSpacing}
                                    signature={renderBappSignature(
                                        previewLetter.progress_officer_name_1,
                                        previewLetter.progress_officer_role_1,
                                        previewLetter.progress_officer_name_2,
                                        previewLetter.progress_officer_role_2
                                    )}
                                    signatureKey={`${previewLetter.progress_officer_name_1 || ''}|${previewLetter.progress_officer_role_1 || ''}|${previewLetter.progress_officer_name_2 || ''}|${previewLetter.progress_officer_role_2 || ''}`}
                                    onPageCountChange={setLampiranPageCount}
                                    pageStartNumber={2}
                                    totalPages={bappDocTotalPages}
                                    canExport={access.canExport}
                                />
                            </>
                        )}

                        {/* Lembar BAST (Hanya di-render jika handover_status aktif) */}
                        {Number(previewLetter.handover_status) === 1 && (
                            <>
                                <div className="text-white text-xs font-mono uppercase bg-emerald-600/20 px-4 py-1.5 rounded-full my-4 border border-emerald-500/30">Lembar berikutnya: (BAST)</div>
                                {renderLembarHalaman(
                                    "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)",
                                    previewLetter.handover_date,
                                    previewLetter.handover_officer_name_1, previewLetter.handover_officer_role_1,
                                    previewLetter.handover_officer_name_2, previewLetter.handover_officer_role_2,
                                    previewLetter.handover_description, "handover_description", true, 'BAST', 1, 1
                                )}
                            </>
                        )}
                    </div>

                    {/* PANEL KONTROL KANAN */}
                    <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0">
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-white font-bold text-lg">Pratinjau Dokumen Resmi</h4>
                                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-800">
                                    Format {totalPages} Halaman Berkas Aktif
                                </span>
                                <p className="text-xs text-slate-400 mt-2">Gunakan editor langsung di area putih untuk merevisi draft teks sebelum dicetak ke berkas PDF.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Jarak Spasi Baris Paragraf</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['1.2', '1.4', '1.6', '1.8'].map((spacing) => (
                                        <button key={spacing} onClick={() => setDocLineSpacing(spacing)} className={`py-2 text-xs font-mono rounded-lg border transition ${docLineSpacing === spacing ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}>
                                            {spacing}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-6 border-t border-slate-800">
                            {access.canEdit && (
                            <button onClick={handleUpdateFromPreview} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition">
                                {isSaving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan Review'}
                            </button>
                            )}
                            {access.canExport && (
                            <button onClick={handlePrintPDF} disabled={isGeneratingPDF} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20">
                                {isGeneratingPDF ? '⏳ Memproses Berkas...' : '📥 Unduh Cetak Berkas PDF'}
                            </button>
                            )}
                            <button onClick={() => setPreviewLetter(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl text-sm transition border border-slate-700">
                                Tutup Pratinjau
                            </button>
                        </div>
                    </div>

                </div>
            );
        })()}
        </div>
    );
};

export default ProjectDocument;