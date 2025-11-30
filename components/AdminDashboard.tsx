import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Search,
  Users,
  Loader2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shirt,
  Banknote,
  PieChart,
  Shield,
  Eye,
  UserPlus,
  ShieldCheck,
  LayoutGrid,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Settings,
  Printer,
  Columns,
  Info,
  Maximize2,
  Minimize2,
  RefreshCcw
} from 'lucide-react';
import { db } from '../firebaseConfig';
import { 
    collection, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    updateDoc, 
    query, 
    orderBy,
    addDoc,
    where,
    getDocs
} from 'firebase/firestore';

// Extend window interface to include ExcelJS and html2pdf loaded from CDN
declare global {
  interface Window {
    ExcelJS: any;
    saveAs: any;
    html2pdf: any;
  }
}

interface FormData {
  id: string; // Firestore uses string IDs
  fullName: string;
  englishName: string;
  dob: string;
  gender: string;
  tShirtSize: string;
  phoneNumber: string;
  stake: string;
  ward: string;
  recordNumber: string;
  mediaConsent: boolean;
  paymentStatus: string;
  otherReason: string;
  timestamp: string;
  isPaid?: boolean; // New field for Admin Verification
}

interface SystemUser {
  id: string;
  username: string;
  password: string; // Note: In production, this should be hashed. Using plain text for simple demo.
  role: 'admin' | 'viewer';
  createdAt: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
  role: 'admin' | 'viewer';
}

// PDF Settings Interface
interface PdfSettings {
    orientation: 'portrait' | 'landscape';
    fontSize: number;
    cellPadding: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
}

interface ColumnVisibility {
    no: boolean;
    khmerName: boolean;
    englishName: boolean;
    gender: boolean;
    dob: boolean;
    tShirt: boolean;
    phone: boolean;
    stake: boolean;
    ward: boolean;
    recordNumber: boolean;
    paid: boolean;
    verified: boolean;
    participation: boolean;
}

// Default Weights
const DEFAULT_WEIGHTS: Record<string, number> = {
    no: 0.5,
    khmerName: 2.2,
    englishName: 2.2,
    gender: 0.7,
    dob: 1.0,
    tShirt: 0.6,
    phone: 1.3,
    stake: 1.5,
    ward: 1.5,
    recordNumber: 1.2,
    paid: 1.2,
    verified: 0.5,
    participation: 0.8
};

// Reusing locations from main form for editing
const locations: Record<string, string[]> = {
    "ស្តេកខាងត្បូង": [
      "វួដស្ទឹងមានជ័យទី១",
      "វួដស្ទឹងមានជ័យទី២",
      "វួដស្ទឹងមានជ័យទី៣",
      "វួដទួលទំពូង"
    ],
    "ស្តេកខាងជើង": [
      "វួដទឹកថ្លា",
      "វួដទឹកល្អក់",
      "វួដទួលគោក",
      "វួលទួលសង្កែ",
      "វួដពោធិចិនតុង",
      "សាខាសែនសុខ"
    ],
    "មណ្ឌលខាងកើត": [
      "សាខាចំការមន",
      "សាខាច្បារអំពៅ",
      "សាខាកណ្តាល",
      "សាខាតាខ្មៅទី១",
      "សាខាតាខ្មៅទី២",
      "សាខាតាខ្មៅទី៣"
    ],
    "មណ្ឌលកំពង់ចាម និង កំពង់ធំ": [
      "សាខាកំពង់ចាមទី១",
      "សាខាកំពង់ចាមទី២",
      "សាខាកំពង់ចាមទី៣",
      "សាខាកំពង់ធំ"
    ],
    "មណ្ឌលបាត់ដំបង": [
      "សាខាស្ទឹងសង្កែ",
      "សាខារតនៈ",
      "សាខា១៣មករា"
    ],
    "មណ្ឌលសៀមរាប": [
      "សាខាសៀមរាបទី១",
      "សាខាសៀមរាបទី២",
      "សាខាសៀមរាបទី៣"
    ]
  };

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, role }) => {
  const [activeTab, setActiveTab] = useState<'registrations' | 'users'>('registrations');
  
  // Registration Data State
  const [registrations, setRegistrations] = useState<FormData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [filterGender, setFilterGender] = useState('');
  const [filterTShirt, setFilterTShirt] = useState('');
  const [filterStake, setFilterStake] = useState('');
  const [filterWard, setFilterWard] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData | null>(null);
  const [wards, setWards] = useState<string[]>([]); // For editing modal
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // User Management State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' });
  const [userError, setUserError] = useState('');

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // PDF Settings State
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
      orientation: 'landscape',
      fontSize: 9, 
      cellPadding: 6,
      marginTop: 10,
      marginRight: 10,
      marginBottom: 10,
      marginLeft: 10
  });

  const [columnWeights, setColumnWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);

  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
      no: true,
      khmerName: true,
      englishName: true,
      gender: true,
      dob: false,
      tShirt: true,
      phone: true,
      stake: true,
      ward: true,
      recordNumber: true,
      paid: false,
      verified: false,
      participation: true
  });

  // Clear notification automatically
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => {
            setNotification(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper to convert number to Khmer numerals
  const toKhmerNumerals = (num: number) => {
    const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(n => khmerNums[parseInt(n)]).join('');
  };

  // Fetch Registrations
  useEffect(() => {
    if (!db) {
         const data = localStorage.getItem('ysa_registrations');
         if (data) {
             const parsed = JSON.parse(data).map((item: any) => ({
                 ...item,
                 id: item.id.toString()
             })).sort((a: FormData, b: FormData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
             setRegistrations(parsed);
         }
         setIsLoading(false);
         return;
    }

    const q = query(collection(db, "ysa_registrations"), orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: FormData[] = snapshot.docs.map(doc => ({
            ...(doc.data() as Omit<FormData, 'id'>),
            id: doc.id
        }));
        setRegistrations(data);
        setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching registrations: ", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch System Users (Only if Admin and Tab is Users)
  useEffect(() => {
    if (activeTab === 'users' && role === 'admin' && db) {
        const q = query(collection(db, "ysa_users"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: SystemUser[] = snapshot.docs.map(doc => ({
                ...(doc.data() as Omit<SystemUser, 'id'>),
                id: doc.id
            }));
            setSystemUsers(data);
        });
        return () => unsubscribe();
    }
  }, [activeTab, role]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGender, filterTShirt, filterStake, filterWard]);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
      return registrations.filter(reg => {
        const matchesSearch = 
            reg.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.englishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.phoneNumber.includes(searchTerm);
        
        const matchesGender = filterGender ? reg.gender === filterGender : true;
        const matchesTShirt = filterTShirt ? reg.tShirtSize === filterTShirt : true;
        const matchesStake = filterStake ? reg.stake === filterStake : true;
        const matchesWard = filterWard ? reg.ward === filterWard : true;

        return matchesSearch && matchesGender && matchesTShirt && matchesStake && matchesWard;
      });
  }, [registrations, searchTerm, filterGender, filterTShirt, filterStake, filterWard]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRegistrations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // --- Registration Actions ---
  const handleDelete = async (id: string) => {
    if (role !== 'admin') return;

    if (window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះនេះមែនទេ?')) {
      if (db) {
          try {
              await deleteDoc(doc(db, "ysa_registrations", id));
              setNotification({ message: 'ទិន្នន័យត្រូវបានលុបដោយជោគជ័យ', type: 'success' });
          } catch (error) {
              console.error("Error deleting document: ", error);
              setNotification({ message: 'មានបញ្ហាក្នុងការលុបទិន្នន័យ', type: 'error' });
          }
      } else {
          const updatedList = registrations.filter(reg => reg.id !== id);
          setRegistrations(updatedList);
          localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
          setNotification({ message: 'ទិន្នន័យត្រូវបានលុបដោយជោគជ័យ', type: 'success' });
      }
    }
  };

  // Toggle Payment Verification
  const handleTogglePaid = async (reg: FormData) => {
      if (role !== 'admin') return;

      const newPaidStatus = !reg.isPaid;
      
      try {
          if (db) {
              const docRef = doc(db, "ysa_registrations", reg.id);
              await updateDoc(docRef, { isPaid: newPaidStatus });
          } else {
               // Local Storage Update
               const updatedList = registrations.map(r => 
                  r.id === reg.id ? { ...r, isPaid: newPaidStatus } : r
               );
               setRegistrations(updatedList);
               localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
          }
      } catch (error) {
          console.error("Error updating payment status:", error);
          setNotification({ message: 'Failed to update payment status', type: 'error' });
      }
  };

  const handleEditClick = (reg: FormData) => {
    if (role !== 'admin') return;
    setEditingId(reg.id);
    setEditForm({ ...reg });
    if (reg.stake && locations[reg.stake]) {
        setWards(locations[reg.stake]);
    } else {
        setWards([]);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editForm) return;
    const { name, value, type } = e.target;
    
    let newVal: any = value;
    if (type === 'checkbox') {
        newVal = (e.target as HTMLInputElement).checked;
    }

    setEditForm(prev => {
        if (!prev) return null;
        const updated = { ...prev, [name]: newVal };
        if (name === 'stake') {
            setWards(locations[value as string] || []);
            updated.ward = '';
        }
        return updated;
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingId || role !== 'admin') return;
    
    try {
        if (db) {
            const { id, ...dataToUpdate } = editForm;
            const docRef = doc(db, "ysa_registrations", id);
            await updateDoc(docRef, dataToUpdate as any);
        } else {
            const updatedList = registrations.map(reg => 
                reg.id === editForm.id ? editForm : reg
            );
            setRegistrations(updatedList);
            localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
        }

        setEditingId(null);
        setEditForm(null);
        setNotification({ message: 'ព័ត៌មានត្រូវបានកែប្រែដោយជោគជ័យ!', type: 'success' });

    } catch (error) {
        console.error("Error updating document: ", error);
        setNotification({ message: 'មានបញ្ហាក្នុងការកែប្រែព័ត៌មាន', type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // --- Export PDF Function with Dynamic Settings ---
  const handleExportPDF = async () => {
      setIsGeneratingPdf(true);
      
      // We grab the existing preview content directly
      const previewElement = document.getElementById('pdf-preview-content');

      if (!window.html2pdf || !previewElement) {
          console.error("html2pdf library not loaded or preview missing");
          setNotification({ message: 'បរាជ័យក្នុងការ Export PDF', type: 'error' });
          setIsGeneratingPdf(false);
          return;
      }

      // Clone the node to clean it up for export (remove any preview-specific styles if needed)
      // For now, using the preview element content is exactly what we want (WYSIWYG)
      
      const opt = {
          margin: [pdfSettings.marginTop, pdfSettings.marginRight, pdfSettings.marginBottom, pdfSettings.marginLeft], 
          filename: `YSA_Report_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: pdfSettings.orientation }
      };

      try {
          await window.html2pdf().set(opt).from(previewElement).save();
          setNotification({ message: 'Export PDF ជោគជ័យ!', type: 'success' });
          setShowPdfModal(false);
      } catch (err) {
          console.error("PDF Export Error:", err);
          setNotification({ message: 'បរាជ័យក្នុងការ Export PDF', type: 'error' });
      } finally {
          setIsGeneratingPdf(false);
      }
  };

  // Generate Table for Preview/Export
  const renderPdfTable = (limit?: number) => {
      const dataToRender = limit ? filteredRegistrations.slice(0, limit) : filteredRegistrations;
      
      let filterDescription = "អ្នកចូលរួមទាំងអស់";
      if (filterStake) {
          filterDescription = filterStake;
          if (filterWard) {
              filterDescription += ` (${filterWard})`;
          }
      }

      const allCols = [
        { id: 'no', label: 'ល.រ', weight: columnWeights.no, align: 'center', show: visibleColumns.no },
        { id: 'khmerName', label: 'ឈ្មោះ (ខ្មែរ)', weight: columnWeights.khmerName, align: 'left', show: visibleColumns.khmerName, nowrap: true },
        { id: 'englishName', label: 'ឈ្មោះ (អង់គ្លេស)', weight: columnWeights.englishName, align: 'left', show: visibleColumns.englishName, nowrap: true },
        { id: 'gender', label: 'ភេទ', weight: columnWeights.gender, align: 'center', show: visibleColumns.gender },
        { id: 'dob', label: 'ថ្ងៃកំណើត', weight: columnWeights.dob, align: 'center', show: visibleColumns.dob },
        { id: 'tShirt', label: 'អាវ', weight: columnWeights.tShirt, align: 'center', show: visibleColumns.tShirt },
        { id: 'phone', label: 'លេខទូរស័ព្ទ', weight: columnWeights.phone, align: 'left', show: visibleColumns.phone, nowrap: true },
        { id: 'stake', label: 'ស្តេក/មណ្ឌល', weight: columnWeights.stake, align: 'left', show: visibleColumns.stake },
        { id: 'ward', label: 'វួដ/សាខា', weight: columnWeights.ward, align: 'left', show: visibleColumns.ward },
        { id: 'recordNumber', label: 'លេខកូដសមាជិក', weight: columnWeights.recordNumber, align: 'center', show: visibleColumns.recordNumber },
        { id: 'paid', label: 'ការបង់ប្រាក់', weight: columnWeights.paid, align: 'left', show: visibleColumns.paid },
        { id: 'verified', label: 'Paid', weight: columnWeights.verified, align: 'center', show: visibleColumns.verified },
        { id: 'participation', label: 'ការចូលរួម', weight: columnWeights.participation, align: 'center', show: visibleColumns.participation },
      ];

      const activeCols = allCols.filter(c => c.show);
      const totalWeight = activeCols.reduce((sum, col) => sum + col.weight, 0);

      return (
        <div id="pdf-preview-content" style={{ fontFamily: "'Kantumruy Pro', sans-serif", width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontFamily: "'Moul', serif", color: '#b91c1c', fontSize: `${pdfSettings.fontSize + 12}px`, marginBottom: '5px' }}>បញ្ជីឈ្មោះអ្នកចុះឈ្មោះ YSA 2025</h1>
                <p style={{ fontSize: `${pdfSettings.fontSize + 2}px`, color: '#666', marginBottom: '4px' }}>
                    កាលបរិច្ឆេទ: {new Date().toLocaleDateString('km-KH')} | ចំនួនសរុប: {toKhmerNumerals(filteredRegistrations.length)} នាក់
                </p>
                <p style={{ fontSize: `${pdfSettings.fontSize + 4}px`, fontWeight: 'bold', color: '#333' }}>
                    របាយការណ៍លទ្ឋផលទិន្នន័យសម្រាប់: {filterDescription}
                </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${pdfSettings.fontSize}px`, tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ backgroundColor: '#DC2626', color: 'white', fontWeight: 'bold' }}>
                        {activeCols.map(col => (
                             <th key={col.id} style={{ 
                                 padding: `${pdfSettings.cellPadding}px`, 
                                 border: '1px solid #B91C1C', 
                                 width: `${(col.weight / totalWeight) * 100}%`,
                                 whiteSpace: 'nowrap',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis'
                            }}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataToRender.map((reg, index) => (
                        <tr key={reg.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            {activeCols.map(col => {
                                let content: React.ReactNode = '';
                                const nowrapStyle = col.nowrap ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {};
                                
                                switch(col.id) {
                                    case 'no': content = toKhmerNumerals(index + 1); break;
                                    case 'khmerName': content = reg.fullName; break;
                                    case 'englishName': content = reg.englishName; break;
                                    case 'gender': content = reg.gender; break;
                                    case 'dob': content = reg.dob; break;
                                    case 'tShirt': content = reg.tShirtSize; break;
                                    case 'phone': content = reg.phoneNumber; break;
                                    case 'stake': content = reg.stake; break;
                                    case 'ward': content = reg.ward; break;
                                    case 'recordNumber': content = reg.recordNumber ? 'មាន' : 'អត់'; break;
                                    case 'paid': 
                                            content = reg.paymentStatus === 'agree' ? 'យល់ព្រម' : 
                                                    reg.paymentStatus === 'not_affordable' ? 'មិនមានលទ្ឋភាព' : 
                                                    'ផ្សេងៗ'; 
                                            break;
                                    case 'verified': content = reg.isPaid ? 'Yes' : 'No'; break;
                                    case 'participation': content = <div style={{ width: '14px', height: '14px', border: '1px solid #666', display: 'inline-block', background: 'white', borderRadius: '2px' }}></div>; break;
                                }

                                return (
                                    <td key={col.id} style={{ 
                                        padding: `${pdfSettings.cellPadding}px`, 
                                        textAlign: col.align as any, 
                                        border: '1px solid #e5e7eb',
                                        fontFamily: "'Kantumruy Pro'",
                                        ...(nowrapStyle as any)
                                    }}>
                                        {content}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {/* Add blank rows to fill page visual if needed for preview feel, optional */}
                </tbody>
            </table>
        </div>
      );
  }

  // --- Export Excel Function with Formatting ---
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
        if (!window.ExcelJS) {
            console.error("ExcelJS library not loaded");
            setNotification({ message: 'Library Excel មិនដំណើរការ សូម Refresh', type: 'error' });
            return;
        }

        const workbook = new window.ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('YSA 2025 Registrations');

        // Define Columns with Widths
        sheet.columns = [
            { header: 'No', key: 'no', width: 8 },
            { header: 'ឈ្មោះ (ខ្មែរ)', key: 'fullName', width: 25 },
            { header: 'ឈ្មោះ (អង់គ្លេស)', key: 'englishName', width: 25 },
            { header: 'ភេទ', key: 'gender', width: 10 },
            { header: 'ថ្ងៃកំណើត', key: 'dob', width: 15 },
            { header: 'ទំហំអាវ', key: 'tShirtSize', width: 10 },
            { header: 'លេខទូរស័ព្ទ', key: 'phoneNumber', width: 15 },
            { header: 'ស្តេក/មណ្ឌល', key: 'stake', width: 20 },
            { header: 'វួដ/សាខា', key: 'ward', width: 20 },
            { header: 'លេខកូដសមាជិក', key: 'recordNumber', width: 20 },
            { header: 'ការបង់ប្រាក់', key: 'payment', width: 20 },
            { header: 'Status', key: 'verified', width: 15 },
            { header: 'Media', key: 'media', width: 10 },
            { header: 'Timestamp', key: 'timestamp', width: 25 },
        ];

        // Add Data Rows
        filteredRegistrations.forEach((reg, index) => {
            const paymentText = reg.paymentStatus === 'agree' ? 'យល់ព្រម' : 
                                reg.paymentStatus === 'not_affordable' ? 'មិនមានលទ្ឋភាព' : 
                                reg.otherReason || 'ផ្សេងៗ';

            sheet.addRow({
                no: index + 1,
                fullName: reg.fullName,
                englishName: reg.englishName,
                gender: reg.gender,
                dob: reg.dob,
                tShirtSize: reg.tShirtSize,
                phoneNumber: reg.phoneNumber,
                stake: reg.stake,
                ward: reg.ward,
                recordNumber: reg.recordNumber || '', 
                payment: paymentText,
                verified: reg.isPaid ? 'Paid' : 'Unpaid',
                media: reg.mediaConsent ? 'Yes' : 'No',
                timestamp: new Date(reg.timestamp).toLocaleString()
            });
        });

        // Apply Styling
        // 1. Header Styling
        const headerRow = sheet.getRow(1);
        headerRow.font = { name: 'Kantumruy Pro', family: 4, size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC2626' } // Red background matches admin header
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        // 2. Content Styling
        sheet.eachRow((row: any, rowNumber: number) => {
            if (rowNumber > 1) { // Skip header
                row.font = { name: 'Kantumruy Pro', family: 4, size: 11 };
                row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                
                // Zebra Striping for readability
                if (rowNumber % 2 === 0) {
                     row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9FAFB' } // Light gray
                    };
                }

                // Center align specific columns
                const centerCols = [1, 4, 5, 6, 12, 13];
                centerCols.forEach(colIdx => {
                    const cell = row.getCell(colIdx);
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                // Style "Record Number" column (Column 10) - just center align, no specific color
                const recordCell = row.getCell(10);
                recordCell.alignment = { vertical: 'middle', horizontal: 'center' };

                // Style "Paid" status (Column 12)
                const paidCell = row.getCell(12);
                if (paidCell.value === 'Paid') {
                    paidCell.font = { name: 'Kantumruy Pro', color: { argb: 'FF16A34A' }, bold: true }; // Green
                } else {
                    paidCell.font = { name: 'Kantumruy Pro', color: { argb: 'FFDC2626' } }; // Red
                }
            }

            // Borders for all cells
            row.eachCell((cell: any) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
            });
        });

        // Generate and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        window.saveAs(blob, `YSA_Registration_2025_${new Date().toISOString().split('T')[0]}.xlsx`);

        setNotification({ message: 'Export Excel ជោគជ័យ!', type: 'success' });
    } catch (error) {
        console.error("Export Error:", error);
        setNotification({ message: 'បរាជ័យក្នុងការ Export Excel', type: 'error' });
    } finally {
        setIsExporting(false);
    }
  };

  // --- User Management Actions ---
  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setUserError('');
      if (!db) {
          setUserError("Database not configured. Cannot create users.");
          return;
      }
      if (!newUser.username || !newUser.password) {
          setUserError("Please fill in all fields.");
          return;
      }

      try {
          // Check if username exists
          const q = query(collection(db, "ysa_users"), where("username", "==", newUser.username));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              setUserError("Username already exists.");
              return;
          }

          // Create User
          await addDoc(collection(db, "ysa_users"), {
              username: newUser.username,
              password: newUser.password, // Plain text for simplicity per request context
              role: newUser.role,
              createdAt: new Date().toISOString()
          });

          setShowAddUserModal(false);
          setNewUser({ username: '', password: '', role: 'viewer' });
          setNotification({ message: 'User created successfully!', type: 'success' });
      } catch (err) {
          console.error("Error creating user:", err);
          setUserError("Failed to create user.");
      }
  };

  const handleDeleteUser = async (id: string, username: string) => {
      if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
          if (db) {
              await deleteDoc(doc(db, "ysa_users", id));
              setNotification({ message: 'User deleted successfully', type: 'success' });
          }
      }
  };


  const getPaymentLabel = (status: string, reason: string) => {
    if (status === 'agree') return <span className="text-green-600 font-bold">យល់ព្រម</span>;
    if (status === 'not_affordable') return <span className="text-red-500 font-bold">មិនទាន់មានលទ្ឋភាព</span>;
    return <span className="text-orange-600 italic">{reason}</span>;
  };

  // --- Statistics Logic ---
  const stats = {
    total: registrations.length,
    paid: registrations.filter(r => r.paymentStatus === 'agree').length,
    verifiedPaid: registrations.filter(r => r.isPaid).length,
    notPaid: registrations.filter(r => r.paymentStatus !== 'agree').length,
    male: registrations.filter(r => r.gender === 'ប្រុស').length,
    female: registrations.filter(r => r.gender === 'ស្រី').length,
    sizes: {
        XS: registrations.filter(r => r.tShirtSize === 'XS').length,
        S: registrations.filter(r => r.tShirtSize === 'S').length,
        M: registrations.filter(r => r.tShirtSize === 'M').length,
        L: registrations.filter(r => r.tShirtSize === 'L').length,
        XL: registrations.filter(r => r.tShirtSize === 'XL').length,
        XXL: registrations.filter(r => r.tShirtSize === 'XXL').length,
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-khmer">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in transition-all duration-300 ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 opacity-80 hover:opacity-100">
                <X className="w-4 h-4" />
            </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
             <div className={`${role === 'admin' ? 'bg-red-600' : 'bg-gray-600'} text-white p-2 rounded-lg`}>
                {role === 'admin' ? <Shield className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 font-moul">
                    {role === 'admin' ? 'Admin Dashboard' : 'Viewer Dashboard'}
                </h1>
                <p className="text-xs text-gray-500">YSA Cambodia Registration 2025</p>
             </div>
          </div>

          {/* Tab Navigation for Admin */}
          {role === 'admin' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveTab('registrations')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'registrations' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <LayoutGrid className="w-4 h-4" /> ទិន្នន័យចុះឈ្មោះ
                  </button>
                  <button 
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <Users className="w-4 h-4" /> គ្រប់គ្រងអ្នកប្រើប្រាស់
                  </button>
              </div>
          )}
          
          <div className="flex items-center gap-3">
              {activeTab === 'registrations' && (
                <button 
                    onClick={() => setShowStats(!showStats)}
                    className={`p-2 rounded-lg transition-colors border ${showStats ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}
                    title="បង្ហាញស្ថិតិ"
                >
                    <PieChart className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">ចាកចេញ</span>
              </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* --- USER MANAGEMENT TAB --- */}
        {activeTab === 'users' && role === 'admin' && (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">System Users</h2>
                    <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-colors"
                    >
                        <UserPlus className="w-5 h-5" /> បង្កើត User ថ្មី
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Password</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Master Admin Row (Hardcoded) */}
                            <tr className="bg-yellow-50/50">
                                <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-yellow-600" /> AdminYSACambodia2025
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-500">••••••••</td>
                                <td className="px-6 py-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">Master Admin</span></td>
                                <td className="px-6 py-4 text-gray-500 text-sm">System Default</td>
                                <td className="px-6 py-4 text-center text-gray-400 italic text-sm">Cannot Delete</td>
                            </tr>
                            
                            {/* Master Viewer Row (Hardcoded) */}
                            <tr className="bg-gray-50/50">
                                <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-gray-600" /> ViewerYSA
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-500">••••••••</td>
                                <td className="px-6 py-4"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">Master Viewer</span></td>
                                <td className="px-6 py-4 text-gray-500 text-sm">System Default</td>
                                <td className="px-6 py-4 text-center text-gray-400 italic text-sm">Cannot Delete</td>
                            </tr>

                            {/* Dynamic Users */}
                            {systemUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-800">{user.username}</td>
                                    <td className="px-6 py-4 font-mono text-gray-600">{user.password}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {systemUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No additional users created yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- REGISTRATIONS TAB (Default) --- */}
        {activeTab === 'registrations' && (
          <>
            {/* Statistics Section */}
            {showStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Total Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-bold">អ្នកចុះឈ្មោះសរុប</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Gender Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-gray-500 text-sm font-bold mb-2">ភេទ</p>
                        <div className="flex justify-between items-center">
                            <div className="text-center">
                                <span className="block text-xl font-bold text-blue-600">{stats.male}</span>
                                <span className="text-xs text-gray-500">ប្រុស</span>
                            </div>
                            <div className="h-8 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <span className="block text-xl font-bold text-pink-600">{stats.female}</span>
                                <span className="text-xs text-gray-500">ស្រី</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-bold">ការបង់ប្រាក់</p>
                            <div className="flex gap-2 mt-1">
                                <div className="text-center">
                                    <span className="text-green-600 font-bold text-lg block">{stats.paid}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">សន្យា</span>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <span className="text-blue-600 font-bold text-lg block">{stats.verifiedPaid}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">បានបង់</span>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <span className="text-red-500 font-bold text-lg block">{stats.notPaid}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">មិនទាន់</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full text-green-600">
                            <Banknote className="w-6 h-6" />
                        </div>
                    </div>

                    {/* T-Shirt Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-500 text-sm font-bold">ទំហំអាវ</p>
                            <Shirt className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="grid grid-cols-6 gap-1 text-center text-xs">
                            {Object.entries(stats.sizes).map(([size, count]) => (
                                <div key={size} className="bg-gray-50 rounded p-1">
                                    <div className="font-bold text-gray-800">{count}</div>
                                    <div className="text-gray-400 scale-75">{size}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full md:w-96">
                    <input 
                        type="text"
                        placeholder="ស្វែងរកឈ្មោះ ឬលេខទូរស័ព្ទ..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setShowPdfModal(true)}
                        disabled={isGeneratingPdf}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors font-bold disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        <span>Export PDF</span>
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        disabled={isExporting}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm transition-colors font-bold disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                        <Filter className="w-4 h-4" />
                    </div>
                    <select 
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-gray-50 text-sm font-medium text-gray-700 appearance-none cursor-pointer"
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                    >
                        <option value="">ភេទ (ទាំងអស់)</option>
                        <option value="ប្រុស">ប្រុស</option>
                        <option value="ស្រី">ស្រី</option>
                    </select>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                        <Filter className="w-4 h-4" />
                    </div>
                    <select 
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-gray-50 text-sm font-medium text-gray-700 appearance-none cursor-pointer"
                        value={filterTShirt}
                        onChange={(e) => setFilterTShirt(e.target.value)}
                    >
                        <option value="">ទំហំអាវ (ទាំងអស់)</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                        <Filter className="w-4 h-4" />
                    </div>
                    <select 
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-gray-50 text-sm font-medium text-gray-700 appearance-none cursor-pointer"
                        value={filterStake}
                        onChange={(e) => {
                            setFilterStake(e.target.value);
                            setFilterWard('');
                        }}
                    >
                        <option value="">ស្តេក/មណ្ឌល (ទាំងអស់)</option>
                        {Object.keys(locations).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                        <Filter className="w-4 h-4" />
                    </div>
                    <select 
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-gray-50 text-sm font-medium text-gray-700 appearance-none cursor-pointer disabled:opacity-50"
                        value={filterWard}
                        onChange={(e) => setFilterWard(e.target.value)}
                        disabled={!filterStake}
                    >
                        <option value="">វួដ/សាខា (ទាំងអស់)</option>
                        {filterStake && locations[filterStake] && locations[filterStake].map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-sm text-left">
                        <thead className="bg-red-600 text-white font-bold border-b border-red-700">
                            <tr>
                                <th className="px-4 py-3">No</th>
                                <th className="px-4 py-3">ឈ្មោះ (ខ្មែរ)</th>
                                <th className="px-4 py-3">ឈ្មោះ (អង់គ្លេស)</th>
                                <th className="px-4 py-3">ភេទ</th>
                                <th className="px-4 py-3">ថ្ងៃកំណើត</th>
                                <th className="px-4 py-3">ទំហំអាវ</th>
                                <th className="px-4 py-3">លេខទូរស័ព្ទ</th>
                                <th className="px-4 py-3">ស្តេក/មណ្ឌល</th>
                                <th className="px-4 py-3">វួដ/សាខា</th>
                                <th className="px-4 py-3 text-center">លេខកូដសមាជិក</th>
                                <th className="px-4 py-3">ការបង់ប្រាក់</th>
                                <th className="px-4 py-3 text-center">Paid</th>
                                <th className="px-4 py-3 text-center">Media</th>
                                {role === 'admin' && (
                                    <th className="px-4 py-3 text-center">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={role === 'admin' ? 14 : 13} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
                                            <p>កំពុងទាញយកទិន្នន័យ...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((reg, index) => {
                                    // Calculate global index relative to the FULL filtered list
                                    const globalIndex = indexOfFirstItem + index;
                                    // Numbering 1, 2, 3... based on sort order (Oldest first)
                                    const displayNumber = globalIndex + 1;
                                    const khmerNumber = toKhmerNumerals(displayNumber);

                                    return (
                                    <tr key={reg.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-4 py-3 text-gray-800 font-bold font-khmer">{khmerNumber}</td>
                                        <td className="px-4 py-3 font-bold text-gray-800">{reg.fullName}</td>
                                        <td className="px-4 py-3 text-gray-600">{reg.englishName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${reg.gender === 'ប្រុស' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                {reg.gender}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{reg.dob}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200">
                                                {reg.tShirtSize}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-600">{reg.phoneNumber}</td>
                                        <td className="px-4 py-3 text-gray-600">{reg.stake}</td>
                                        <td className="px-4 py-3 text-gray-600">{reg.ward}</td>
                                        <td className="px-4 py-3 text-center font-mono text-gray-700">
                                            {reg.recordNumber || <span className="text-gray-400 italic">-</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getPaymentLabel(reg.paymentStatus, reg.otherReason)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handleTogglePaid(reg)}
                                                disabled={role !== 'admin'}
                                                className={`p-1 rounded-full transition-colors ${reg.isPaid ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                title={reg.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                                            >
                                                {reg.isPaid ? <CheckCircle className="w-5 h-5 fill-green-100" /> : <Clock className="w-5 h-5" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {reg.mediaConsent ? (
                                                <span className="text-green-500 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">យល់ព្រម</span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold">បដិសេធ</span>
                                            )}
                                        </td>
                                        {role === 'admin' && (
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button 
                                                        onClick={() => handleEditClick(reg)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                        title="កែសម្រួល"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(reg.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="លុបចោល"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={role === 'admin' ? 14 : 13} className="px-4 py-8 text-center text-gray-500">
                                        មិនមានទិន្នន័យ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                {!isLoading && filteredRegistrations.length > 0 && (
                    <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            បង្ហាញ {indexOfFirstItem + 1} ទៅ {Math.min(indexOfLastItem, filteredRegistrations.length)} នៃ {filteredRegistrations.length} អ្នក
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <div className="hidden sm:flex space-x-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                    <button
                                        key={number}
                                        onClick={() => paginate(number)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === number 
                                            ? 'bg-red-600 text-white border border-red-600' 
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {number}
                                    </button>
                                ))}
                            </div>

                            <div className="sm:hidden px-2 text-sm font-medium">
                            {currentPage} / {totalPages}
                            </div>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </>
        )}
      </div>

      {/* PDF Export Settings Modal (New Split View) */}
      {showPdfModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                      <div className="flex items-center gap-3">
                          <div className="bg-red-100 p-2 rounded-lg text-red-600">
                              <Printer className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold font-moul text-gray-800">Export PDF Studio</h3>
                              <p className="text-xs text-gray-500">Live Preview & Custom Layout</p>
                          </div>
                      </div>
                      <div className="flex gap-3">
                         <button 
                            onClick={() => setColumnWeights(DEFAULT_WEIGHTS)}
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 px-3 py-1 rounded bg-gray-100 hover:bg-blue-50 transition-colors"
                         >
                            <RefreshCcw className="w-3 h-3" /> Reset Layout
                         </button>
                         <button onClick={() => setShowPdfModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                              <X className="w-6 h-6" />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex flex-1 overflow-hidden">
                      {/* LEFT PANEL: Settings */}
                      <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-gray-200 bg-gray-50 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                          
                          {/* 1. Page Settings */}
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Settings className="w-4 h-4 text-blue-500" /> Page Settings
                                </h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-2 block">ORIENTATION</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setPdfSettings({...pdfSettings, orientation: 'portrait'})}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${pdfSettings.orientation === 'portrait' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                            >
                                                Portrait
                                            </button>
                                            <button 
                                                onClick={() => setPdfSettings({...pdfSettings, orientation: 'landscape'})}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${pdfSettings.orientation === 'landscape' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                            >
                                                Landscape
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">FONT SIZE</label>
                                            <input 
                                                type="number" 
                                                value={pdfSettings.fontSize}
                                                onChange={(e) => setPdfSettings({...pdfSettings, fontSize: Number(e.target.value)})}
                                                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">PADDING</label>
                                            <input 
                                                type="number" 
                                                value={pdfSettings.cellPadding}
                                                onChange={(e) => setPdfSettings({...pdfSettings, cellPadding: Number(e.target.value)})}
                                                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                          </div>

                          {/* 2. Column Management */}
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Columns className="w-4 h-4 text-blue-500" /> Column Widths
                                </h4>
                                <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                                    ទាញគ្រាប់រំកិលដើម្បីកែតម្រូវទំហំជួរឈរ។ ដកគ្រីសចេញបើមិនចង់បង្ហាញ។
                                </p>

                                <div className="space-y-1">
                                    {[
                                      { key: 'no', label: 'ល.រ (No)' },
                                      { key: 'khmerName', label: 'ឈ្មោះ (ខ្មែរ)' },
                                      { key: 'englishName', label: 'ឈ្មោះ (អង់គ្លេស)' },
                                      { key: 'gender', label: 'ភេទ' },
                                      { key: 'dob', label: 'ថ្ងៃកំណើត' },
                                      { key: 'tShirt', label: 'ទំហំអាវ' },
                                      { key: 'phone', label: 'លេខទូរស័ព្ទ' },
                                      { key: 'stake', label: 'ស្តេក/មណ្ឌល' },
                                      { key: 'ward', label: 'វួដ/សាខា' },
                                      { key: 'recordNumber', label: 'លេខកូដសមាជិក' },
                                      { key: 'paid', label: 'ស្ថានភាពបង់ប្រាក់' },
                                      { key: 'verified', label: 'Paid Verification' },
                                      { key: 'participation', label: 'ប្រអប់វត្តមាន' },
                                    ].map((col) => (
                                        <div key={col.key} className={`p-3 rounded-lg border transition-all ${ (visibleColumns as any)[col.key] ? 'border-gray-200 bg-white' : 'border-transparent bg-gray-50 opacity-60' }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={(visibleColumns as any)[col.key]}
                                                        onChange={(e) => setVisibleColumns({...visibleColumns, [col.key]: e.target.checked})}
                                                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                                    />
                                                    <span className="text-sm font-bold text-gray-700">{col.label}</span>
                                                </div>
                                                {(visibleColumns as any)[col.key] && (
                                                    <span className="text-xs font-mono text-gray-400">
                                                        {columnWeights[col.key]?.toFixed(1) || '1.0'}x
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {(visibleColumns as any)[col.key] && (
                                                <input 
                                                    type="range"
                                                    min="0.2"
                                                    max="5.0"
                                                    step="0.1"
                                                    value={columnWeights[col.key] || 1}
                                                    onChange={(e) => setColumnWeights({
                                                        ...columnWeights,
                                                        [col.key]: parseFloat(e.target.value)
                                                    })}
                                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                          </div>
                      </div>

                      {/* RIGHT PANEL: Preview */}
                      <div className="flex-1 bg-gray-200 flex flex-col overflow-hidden relative">
                          <div className="absolute top-4 right-4 z-10 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
                              Live Preview
                          </div>
                          
                          {/* Paper Container - Scrollable */}
                          <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                              <div 
                                className="bg-white shadow-xl transition-all duration-300 origin-top"
                                style={{
                                    // A4 Aspect Ratio Simulation
                                    width: pdfSettings.orientation === 'portrait' ? '210mm' : '297mm',
                                    minHeight: pdfSettings.orientation === 'portrait' ? '297mm' : '210mm',
                                    paddingTop: `${pdfSettings.marginTop}mm`,
                                    paddingRight: `${pdfSettings.marginRight}mm`,
                                    paddingBottom: `${pdfSettings.marginBottom}mm`,
                                    paddingLeft: `${pdfSettings.marginLeft}mm`,
                                    transform: 'scale(0.85)', // Slight zoom out to fit screen better
                                }}
                              >
                                  {/* RENDER THE ACTUAL TABLE HERE */}
                                  {renderPdfTable(15)} {/* Show first 15 rows for preview performance */}
                                  
                                  <div className="mt-4 text-center text-xs text-gray-400 italic p-4 border-t border-dashed">
                                      --- Preview truncated to 15 records for performance ---
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center z-10">
                      <div className="text-sm text-gray-500">
                          {filteredRegistrations.length} records ready to export.
                      </div>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setShowPdfModal(false)}
                              className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                          >
                              បោះបង់
                          </button>
                          <button 
                              onClick={handleExportPDF}
                              disabled={isGeneratingPdf}
                              className="px-8 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-200"
                          >
                              {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                              Download PDF
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {editingId && editForm && role === 'admin' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold font-moul text-gray-800">កែសម្រួលព័ត៌មាន</h2>
                    <button onClick={handleCancelEdit} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Simplified Form for Editing */}
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ឈ្មោះ (ខ្មែរ)</label>
                        <input type="text" name="fullName" value={editForm.fullName} onChange={handleEditChange} className="w-full p-2 border rounded-lg" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ឈ្មោះ (អង់គ្លេស)</label>
                        <input type="text" name="englishName" value={editForm.englishName} onChange={handleEditChange} className="w-full p-2 border rounded-lg" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ថ្ងៃកំណើត</label>
                        <input type="date" name="dob" value={editForm.dob} onChange={handleEditChange} className="w-full p-2 border rounded-lg" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ភេទ</label>
                        <select name="gender" value={editForm.gender} onChange={handleEditChange} className="w-full p-2 border rounded-lg">
                             <option value="ប្រុស">ប្រុស</option>
                             <option value="ស្រី">ស្រី</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ</label>
                        <input type="text" name="phoneNumber" value={editForm.phoneNumber} onChange={handleEditChange} className="w-full p-2 border rounded-lg" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ទំហំអាវ</label>
                        <select name="tShirtSize" value={editForm.tShirtSize} onChange={handleEditChange} className="w-full p-2 border rounded-lg">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ស្តេក/មណ្ឌល</label>
                        <select name="stake" value={editForm.stake} onChange={handleEditChange} className="w-full p-2 border rounded-lg">
                             {Object.keys(locations).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">វួដ/សាខា</label>
                        <select name="ward" value={editForm.ward} onChange={handleEditChange} className="w-full p-2 border rounded-lg">
                             <option value="">ជ្រើសរើស</option>
                             {wards.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">លេខកូដសមាជិក</label>
                        <input type="text" name="recordNumber" value={editForm.recordNumber} onChange={handleEditChange} className="w-full p-2 border rounded-lg uppercase" />
                     </div>
                     
                     <div className="md:col-span-2 border-t pt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">ការបង់ប្រាក់</label>
                        <div className="flex gap-4 flex-wrap">
                            <label className="flex items-center gap-2">
                                <input type="radio" name="paymentStatus" value="agree" checked={editForm.paymentStatus === 'agree'} onChange={handleEditChange} /> យល់ព្រមបង់
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="paymentStatus" value="not_affordable" checked={editForm.paymentStatus === 'not_affordable'} onChange={handleEditChange} /> មិនមានលទ្ឋភាព
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="paymentStatus" value="other" checked={editForm.paymentStatus === 'other'} onChange={handleEditChange} /> ផ្សេងៗ
                            </label>
                        </div>
                        {editForm.paymentStatus === 'other' && (
                            <input type="text" name="otherReason" value={editForm.otherReason} onChange={handleEditChange} placeholder="Reason" className="w-full mt-2 p-2 border rounded-lg" />
                        )}
                        
                        <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                             <input type="checkbox" name="isPaid" checked={!!editForm.isPaid} onChange={handleEditChange} className="w-5 h-5 rounded text-blue-600" />
                             <label className="font-bold text-blue-800">បញ្ជាក់ការបង់ប្រាក់ (Verified Paid)</label>
                        </div>
                     </div>

                     <div className="md:col-span-2">
                        <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                            <input type="checkbox" name="mediaConsent" checked={editForm.mediaConsent} onChange={handleEditChange} className="w-5 h-5 rounded text-red-600" />
                            យល់ព្រមថតរូប/វីដេអូ
                        </label>
                     </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={handleCancelEdit} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100">
                        បោះបង់
                    </button>
                    <button onClick={handleSaveEdit} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center gap-2">
                        <Save className="w-4 h-4" /> រក្សាទុក
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                  <div className="p-6 border-b border-gray-100">
                      <h2 className="text-xl font-bold font-moul text-gray-800">បង្កើត User ថ្មី</h2>
                  </div>
                  <form onSubmit={handleAddUser} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 outline-none" 
                            value={newUser.username}
                            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 outline-none" 
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                          <select 
                            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 outline-none"
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'viewer'})}
                          >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                          </select>
                      </div>

                      {userError && <p className="text-red-500 text-sm">{userError}</p>}

                      <div className="flex gap-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => setShowAddUserModal(false)}
                            className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50"
                          >
                              បោះបង់
                          </button>
                          <button 
                            type="submit"
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          >
                              បង្កើត
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;