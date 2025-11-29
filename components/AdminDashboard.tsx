import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { db } from '../firebaseConfig';
import { 
    collection, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    updateDoc, 
    query, 
    orderBy 
} from 'firebase/firestore';

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
}

interface AdminDashboardProps {
  onLogout: () => void;
}

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
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

  // Helper to convert number to Khmer numerals
  const toKhmerNumerals = (num: number) => {
    const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(n => khmerNums[parseInt(n)]).join('');
  };

  // Fetch Data from Firebase (Real-time listener)
  useEffect(() => {
    if (!db) {
         // Fallback to local storage if DB is not configured (just for display purposes in this demo)
         const data = localStorage.getItem('ysa_registrations');
         if (data) {
             const parsed = JSON.parse(data).map((item: any) => ({
                 ...item,
                 id: item.id.toString() // Ensure ID is string for consistency
             })).sort((a: FormData, b: FormData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
             setRegistrations(parsed);
         }
         setIsLoading(false);
         return;
    }

    // Sort by timestamp Descending (Newest first)
    const q = query(collection(db, "ysa_registrations"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: FormData[] = snapshot.docs.map(doc => ({
            ...(doc.data() as Omit<FormData, 'id'>),
            id: doc.id
        }));
        setRegistrations(data);
        setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching registrations: ", error);
        
        // Handle Permission Error by falling back to Local Storage
        const errorMessage = error?.message || "";
        if (error?.code === 'permission-denied' || errorMessage.includes("Missing or insufficient permissions") || errorMessage.includes("permission-denied")) {
             console.warn("Falling back to local storage due to permission error");
             const data = localStorage.getItem('ysa_registrations');
             if (data) {
                 const parsed = JSON.parse(data).map((item: any) => ({
                     ...item,
                     id: item.id.toString()
                 })).sort((a: FormData, b: FormData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                 setRegistrations(parsed);
             }
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGender, filterTShirt, filterStake, filterWard]);

  // Filter registrations based on search and dropdown filters
  const filteredRegistrations = registrations.filter(reg => {
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

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRegistrations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleDelete = async (id: string) => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបឈ្មោះនេះមែនទេ?')) {
      if (db) {
          try {
              await deleteDoc(doc(db, "ysa_registrations", id));
          } catch (error) {
              console.error("Error deleting document: ", error);
              // If online delete fails (e.g. permission), try local
              const updatedList = registrations.filter(reg => reg.id !== id);
              setRegistrations(updatedList);
              localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
          }
      } else {
          // Local storage fallback
          const updatedList = registrations.filter(reg => reg.id !== id);
          setRegistrations(updatedList);
          localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
      }
    }
  };

  const handleEditClick = (reg: FormData) => {
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
        
        // Update wards if stake changes
        if (name === 'stake') {
            setWards(locations[value as string] || []);
            updated.ward = ''; // Reset ward
        }
        return updated;
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingId) return;
    
    if (db) {
        try {
            const { id, ...dataToUpdate } = editForm;
            const docRef = doc(db, "ysa_registrations", id);
            await updateDoc(docRef, dataToUpdate as any);
            setEditingId(null);
            setEditForm(null);
        } catch (error) {
            console.error("Error updating document: ", error);
            // Fallback save locally if cloud fails
            const updatedList = registrations.map(reg => 
                reg.id === editForm.id ? editForm : reg
            );
            setRegistrations(updatedList);
            localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
            setEditingId(null);
            setEditForm(null);
        }
    } else {
        // Local storage fallback
        const updatedList = registrations.map(reg => 
            reg.id === editForm.id ? editForm : reg
        );
        setRegistrations(updatedList);
        localStorage.setItem('ysa_registrations', JSON.stringify(updatedList));
        setEditingId(null);
        setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleExportCSV = () => {
    // Define headers
    const headers = [
      "No", "Khmer Name", "English Name", "Gender", "DOB", "T-Shirt", 
      "Phone", "Stake", "Ward", "Record Number", "Payment Status", 
      "Other Reason", "Media Consent", "Timestamp"
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(","), // Header row
      ...filteredRegistrations.map((reg, index) => { // Use filteredRegistrations to export only what is seen
        return [
          index + 1,
          `"${reg.fullName}"`, // Quote strings to handle commas inside content
          `"${reg.englishName}"`,
          `"${reg.gender}"`,
          `"${reg.dob}"`,
          `"${reg.tShirtSize}"`,
          `"${reg.phoneNumber}"`,
          `"${reg.stake}"`,
          `"${reg.ward}"`,
          `"${reg.recordNumber || ''}"`,
          `"${reg.paymentStatus}"`,
          `"${reg.otherReason || ''}"`,
          reg.mediaConsent ? "Yes" : "No",
          `"${reg.timestamp}"`
        ].join(",");
      })
    ].join("\n");

    // Create a Blob and trigger download
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8 support
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `ysa_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentLabel = (status: string, reason: string) => {
    if (status === 'agree') return <span className="text-green-600 font-bold">យល់ព្រម</span>;
    if (status === 'not_affordable') return <span className="text-red-500 font-bold">មិនទាន់មានលទ្ឋភាព</span>;
    return <span className="text-orange-600 italic">{reason}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-khmer">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="bg-red-600 text-white p-2 rounded-lg">
                <Users className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-800 font-moul">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">YSA Cambodia Registration 2025 (Cloud)</p>
             </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">ចាកចេញ</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
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
                    onClick={handleExportCSV}
                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm transition-colors font-bold"
                >
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                </button>
                
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-red-500" />}
                    <span className="text-gray-600 font-bold text-sm">សរុប: <span className="text-red-600 text-lg">{toKhmerNumerals(filteredRegistrations.length)}</span></span>
                </div>
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
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
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
                            <th className="px-4 py-3">លេខកូដសមាជិក</th>
                            <th className="px-4 py-3">ការបង់ប្រាក់</th>
                            <th className="px-4 py-3 text-center">Media</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
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
                                // Count BACKWARDS from the total length (Newest = Highest Number)
                                // If list has 10 items. Item 0 (Newest) should show 10. Item 1 should show 9.
                                const displayNumber = filteredRegistrations.length - globalIndex;
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
                                    <td className="px-4 py-3 font-mono text-gray-500 uppercase">{reg.recordNumber || '-'}</td>
                                    <td className="px-4 py-3">
                                        {getPaymentLabel(reg.paymentStatus, reg.otherReason)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {reg.mediaConsent ? (
                                            <span className="text-green-500 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">យល់ព្រម</span>
                                        ) : (
                                            <span className="text-red-500 text-xs font-bold">បដិសេធ</span>
                                        )}
                                    </td>
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
                                </tr>
                            )})
                        ) : (
                            <tr>
                                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
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

                        {/* Mobile view simple page indicator */}
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
      </div>

      {/* Edit Modal */}
      {editingId && editForm && (
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
    </div>
  );
};

export default AdminDashboard;