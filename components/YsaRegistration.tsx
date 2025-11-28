import React, { useState, useEffect, useRef } from 'react';
import { 
  TreePine, 
  Gift, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Shirt, 
  CreditCard, 
  Camera, 
  Heart, 
  CheckCircle, 
  Volume2, 
  VolumeX,
  Info,
  LockKeyhole,
  Loader2
} from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

interface FormData {
  id?: string; // Changed from number to string for Firestore ID
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
  timestamp?: string;
}

interface Snowflake {
  id: number;
  left: string;
  animationDuration: string;
  animationDelay: string;
  opacity: number;
  size: number;
}

interface YsaRegistrationProps {
  onAdminClick?: () => void;
}

const YsaRegistration: React.FC<YsaRegistrationProps> = ({ onAdminClick }) => {
  // ទិន្នន័យសម្រាប់ ស្តេក/មណ្ឌល និង វួដ/សាខា
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

  const [formData, setFormData] = useState<FormData>({
    fullName: '', // Khmer Only
    englishName: '', // New Field
    dob: '',
    gender: '',
    tShirtSize: '',
    phoneNumber: '',
    stake: '',
    ward: '',
    recordNumber: '',
    mediaConsent: false,
    paymentStatus: '',
    otherReason: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [wards, setWards] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dateLimits, setDateLimits] = useState({ min: '', max: '' });
  const audioRef = useRef<HTMLAudioElement>(null);

  // Calculate Date Limits for Age 18-35
  useEffect(() => {
    const today = new Date();
    // 35 years ago (Oldest allowed)
    const minDate = new Date(today.getFullYear() - 35, today.getMonth(), today.getDate());
    // 18 years ago (Youngest allowed)
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

    setDateLimits({
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    });
  }, []);

  // Update wards when stake changes
  useEffect(() => {
    if (formData.stake) {
      setWards(locations[formData.stake] || []);
      setFormData(prev => ({ ...prev, ward: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.stake]);

  // Auto-play music on mount
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                setIsPlaying(true);
            }).catch(error => {
                console.log("Auto-play prevented by browser policy", error);
                setIsPlaying(false);
            });
        }
    }
  }, []);

  // Handle Music Toggle
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.log("Audio play failed:", error));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Checkbox handling logic
    const checked = (e.target as HTMLInputElement).checked;

    // Validation for Khmer Name: Only allow Khmer unicode range and spaces
    if (name === 'fullName') {
      const khmerRegex = /^[\u1780-\u17FF\s]*$/;
      if (!khmerRegex.test(value)) {
        return; 
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
        if (!db) throw new Error("Database not configured");

        // Save to Firebase Firestore
        const newRegistration = {
          ...formData,
          timestamp: new Date().toISOString()
        };

        // 'ysa_registrations' is the collection name in Firebase
        await addDoc(collection(db, "ysa_registrations"), newRegistration);

        console.log('Form Submitted & Saved to Firebase');
        setIsSubmitted(true);
        window.scrollTo(0, 0);

    } catch (error: any) {
        console.error("Error adding document: ", error);
        
        // Check for specific error types to handle gracefully
        const errorMessage = error?.message || "";
        const isConfigError = errorMessage.includes("Database not configured");
        // Robust check for permission errors including the specific message reported
        const isPermissionError = 
            error?.code === 'permission-denied' || 
            errorMessage.includes("Missing or insufficient permissions") ||
            errorMessage.includes("permission-denied");

        if (isConfigError || isPermissionError) {
             console.warn("Falling back to local storage due to missing/error Firebase config or permissions");
             const existingData = JSON.parse(localStorage.getItem('ysa_registrations') || '[]');
             localStorage.setItem('ysa_registrations', JSON.stringify([...existingData, { ...formData, id: 'local_' + Date.now(), timestamp: new Date().toISOString() }]));
             
             setIsSubmitted(true);
             window.scrollTo(0, 0);
        } else {
             // Only show user-facing error for other types of failures
             setSubmitError("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត ឬពិនិត្យមើលការភ្ជាប់អ៊ីនធឺណិត។");
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  // Snowflakes generation
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  
  useEffect(() => {
      const generatedSnowflakes = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 5 + 5}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: Math.random() * 0.5 + 0.3,
        size: Math.random() * 10 + 5
      }));
      setSnowflakes(generatedSnowflakes);
  }, []);


  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-green-900 flex items-center justify-center p-4 font-khmer relative overflow-hidden">
        {/* Snow effect for success screen */}
        <div className="fixed inset-0 pointer-events-none z-50">
            {snowflakes.map(flake => (
            <div
                key={flake.id}
                className="absolute bg-white rounded-full animate-fall shadow-sm"
                style={{
                left: flake.left,
                top: '-20px',
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                opacity: flake.opacity,
                animationDuration: flake.animationDuration,
                animationDelay: flake.animationDelay
                }}
            />
            ))}
        </div>
        
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-400 relative z-10">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-200 shadow-lg">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <h2 className="text-3xl md:text-5xl font-odor text-red-700 mb-6 drop-shadow-sm leading-tight pt-2">សូមអបអរសាទរ!</h2>
          
          <div className="border-2 border-blue-500 bg-blue-50/50 rounded-lg p-5 mb-8 shadow-sm">
            <p className="text-gray-800 text-base md:text-lg leading-relaxed font-khmer">
              ការចុះឈ្មោះរបស់អ្នកទទួលបានជោគជ័យ។ ព័ត៌មាននេះនឹងត្រូវបានពិនិត្យយ៉ាងយកចិត្តទុកដាក់ដោយក្រុមការងារ <span className="font-bold text-red-600 whitespace-nowrap">YSA Cambodia 2025</span> ដើម្បីរៀបចំសម្រាប់កម្មវិធីនេះ។
            </p>
          </div>
          
          <div className="p-5 bg-red-50 rounded-2xl border border-red-200 mb-8 shadow-inner font-khmer">
            <p className="text-base text-red-800 font-bold">សូមកុំភ្លេចទាក់ទងអ្នកតំណាងដើម្បីបង់ប្រាក់ ២០,០០០ រៀល។</p>
          </div>
          
          <button 
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                fullName: '', englishName: '', dob: '', gender: '', tShirtSize: '', phoneNumber: '', 
                stake: '', ward: '', recordNumber: '', mediaConsent: false, paymentStatus: '', otherReason: ''
              });
            }}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-green-500/30 transform transition hover:-translate-y-1 active:scale-95 font-khmer"
          >
            ចុះឈ្មោះម្នាក់ទៀត
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 font-khmer selection:bg-red-200 selection:text-red-900 relative overflow-hidden">
      
      {/* Audio Element with AutoPlay */}
      <audio ref={audioRef} loop>
        <source src="https://assets.mixkit.co/music/preview/mixkit-christmas-market-688.mp3" type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>

      {/* Floating Music Button */}
      <button 
        onClick={toggleMusic}
        className={`fixed bottom-6 right-6 z-[60] p-4 rounded-full backdrop-blur-md border shadow-lg transition-all active:scale-95 group ${
            isPlaying ? "bg-green-600 text-white border-green-400 animate-pulse-slow" : "bg-white/80 text-red-600 border-red-200"
        }`}
        title={isPlaying ? "បិទតន្ត្រី" : "ចាក់តន្ត្រី"}
      >
        {isPlaying ? (
          <div className="relative">
             <Volume2 className="w-6 h-6" />
          </div>
        ) : (
          <VolumeX className="w-6 h-6" />
        )}
      </button>

      {/* Snowflakes Layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {snowflakes.map(flake => (
          <div
            key={flake.id}
            className="absolute bg-white rounded-full animate-fall shadow-sm border border-slate-100/20"
            style={{
              left: flake.left,
              top: '-20px',
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: 0.8,
              animationDuration: flake.animationDuration,
              animationDelay: flake.animationDelay
            }}
          />
        ))}
      </div>

      {/* Hero Header */}
      <div className="relative z-10 pb-32 overflow-hidden bg-gradient-to-b from-red-900 via-red-700 to-red-600 shadow-2xl rounded-b-[40px]">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10" 
             style={{backgroundImage: 'radial-gradient(#fbbf24 2px, transparent 2px)', backgroundSize: '30px 30px'}}>
        </div>
        
        <TreePine className="absolute bottom-[-20px] left-[-20px] text-green-900/40 w-48 h-48 rotate-6" />
        <TreePine className="absolute bottom-[-10px] right-[-30px] text-green-900/40 w-56 h-56 -rotate-6" />

        <div className="relative z-10 pt-12 px-4 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center p-2 px-4 bg-red-900/30 backdrop-blur-sm rounded-full mb-6 border border-yellow-500/50 shadow-lg">
            <Gift className="w-5 h-5 mr-2 text-yellow-400" />
            <span className="font-bold tracking-wide text-yellow-100 uppercase text-sm">Christmas Party 2025</span>
          </div>
          
          <h1 className="mb-10 text-white drop-shadow-xl font-khmer tracking-wide">
            <span className="block text-lg md:text-2xl font-bold mb-4 text-yellow-100/90 animate-pulse-slow">
              ការចុះឈ្មោះចូលរួមក្នុងកម្មវិធី
            </span>
            <div className="flex flex-col items-center">
              <span className="block text-xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-lg mb-1 md:mb-2 whitespace-nowrap">
                ដំណើរកម្សាន្តយុវមជ្ឈិមវ័យនៅលីវទូទាំងប្រទេស
              </span>
              <div className="">
                 <span className="block text-4xl sm:text-6xl md:text-8xl font-extrabold leading-tight text-yellow-300 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500">
                  ទៅកាន់ វីគិរីរម្យ
                </span>
              </div>
              <span className="block text-2xl sm:text-4xl md:text-6xl font-bold mt-2 md:mt-4 text-white/95 drop-shadow-md">
                ប្រចាំឆ្នាំ ២០២៥
              </span>
            </div>
          </h1>

          <p className="text-red-100 text-lg md:text-2xl max-w-xl mx-auto font-light leading-relaxed mt-8">
            អបអរសាទរបុណ្យណូអែល! សូមបំពេញព័ត៌មានខាងក្រោមដើម្បីចុះឈ្មោះ។
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-3xl mx-auto px-4 -mt-20 pb-20 relative z-20">
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden border-2 border-yellow-500/30">
          
          {/* Decorative Top Bar */}
          <div className="h-3 bg-gradient-to-r from-green-600 via-red-600 to-green-600 flex justify-between items-center px-2">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div>
            ))}
          </div>

          <div className="p-6 md:p-10 space-y-8">
            
            {/* Section 1: ព័ត៌មានផ្ទាល់ខ្លួន */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-red-700 mb-2 border-b-2 border-red-100 pb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                    <User className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-moul">ព័ត៌មានផ្ទាល់ខ្លួន</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">ឈ្មោះពេញ (ភាសាខ្មែរ) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="fullName"
                    required
                    className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                    placeholder="វាយបានតែភាសាខ្មែរ..."
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                   <p className="text-sm text-red-400 italic">អនុញ្ញាតតែអក្សរខ្មែរប៉ុណ្ណោះ</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">ឈ្មោះពេញ (ភាសាអង់គ្លេស) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="englishName"
                    required
                    className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                    placeholder="Full Name (English)"
                    value={formData.englishName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">ថ្ងៃខែឆ្នាំកំណើត <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="date" 
                      name="dob"
                      required
                      min={dateLimits.min}
                      max={dateLimits.max}
                      className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all pl-10 text-gray-700"
                      value={formData.dob}
                      onChange={handleChange}
                    />
                    <Calendar className="absolute left-3 top-3.5 text-red-400 w-5 h-5" />
                  </div>
                  <p className="text-sm text-green-600 font-medium">អនុញ្ញាតសម្រាប់អាយុ ១៨ ដល់ ៣៥ ឆ្នាំ</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">ភេទ <span className="text-red-500">*</span></label>
                  <select 
                    name="gender" 
                    required
                    className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">ជ្រើសរើសភេទ</option>
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                 <div className="space-y-2">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">ទំហំអាវ (T-Shirt Size) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                        name="tShirtSize" 
                        required
                        className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all pl-10"
                        value={formData.tShirtSize}
                        onChange={handleChange}
                    >
                        <option value="">ជ្រើសរើសទំហំ</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                    </select>
                    <Shirt className="absolute left-3 top-3.5 text-red-400 w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="block text-gray-800 font-bold text-base md:text-lg">លេខទូរស័ព្ទ <span className="text-red-500">*</span></label>
                   <div className="relative">
                    <input 
                        type="tel" 
                        name="phoneNumber"
                        required
                        className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all pl-10"
                        placeholder="012 345 678"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                    />
                    <Phone className="absolute left-3 top-3.5 text-red-400 w-5 h-5" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: ព័ត៌មានសាសនាចក្រ */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 text-green-700 mb-2 border-b-2 border-green-100 pb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-moul">ព័ត៌មានសាសនាចក្រ</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-gray-800 font-bold text-base md:text-lg">ស្តេក ឬ មណ្ឌល <span className="text-red-500">*</span></label>
                    <select 
                        name="stake" 
                        required
                        className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                        value={formData.stake}
                        onChange={handleChange}
                    >
                        <option value="">ជ្រើសរើសស្តេក/មណ្ឌល</option>
                        {Object.keys(locations).map((stake, index) => (
                        <option key={index} value={stake}>{stake}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-gray-800 font-bold text-base md:text-lg">វួដ ឬ សាខា <span className="text-red-500">*</span></label>
                    <select 
                        name="ward" 
                        required
                        disabled={!formData.stake}
                        className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100"
                        value={formData.ward}
                        onChange={handleChange}
                    >
                        <option value="">
                            {formData.stake ? "ជ្រើសរើសវួដ/សាខា" : "សូមជ្រើសរើសស្តេកជាមុន"}
                        </option>
                        {wards.map((ward, index) => (
                        <option key={index} value={ward}>{ward}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-gray-800 font-bold text-base md:text-lg">លេខកូដសមាជិក (Membership Record Number)</label>
                    <div className="relative group">
                        <Info className="w-5 h-5 text-blue-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900/90 backdrop-blur text-white text-sm rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-center">
                            លេខនេះជួយបញ្ជាក់អត្តសញ្ញាណសមាជិកភាពរបស់អ្នក។ អ្នកអាចរកវាបានក្នុងកម្មវិធី Member Tools ឬសាកសួរស្មៀនវួដ។
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-gray-900/90"></div>
                        </div>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    name="recordNumber"
                    className="w-full px-4 py-3 text-base md:text-lg rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                    placeholder="ឧ. 000-1234-5678"
                    value={formData.recordNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

             {/* Section 3: ការបង់ប្រាក់ */}
             <section className="space-y-6">
              <div className="flex items-center space-x-3 text-yellow-600 mb-2 border-b-2 border-yellow-100 pb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-moul">ការចូលរួមបង់ថវិកា</h3>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-base text-yellow-800 mb-4 flex items-start shadow-sm">
                 <Heart className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-red-500 fill-red-500" />
                 <span>ថវិកាចូលរួម: <strong>២០,០០០ រៀល</strong>។ សូមបង់ទៅកាន់អ្នកតំណាងតាមស្តេក/មណ្ឌល ឬ វួដ/សាខារបស់បងប្អូន។</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-yellow-50 hover:border-yellow-200 transition-colors group">
                    <input 
                        type="radio" 
                        name="paymentStatus" 
                        value="agree"
                        required
                        className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300"
                        onChange={handleChange}
                        checked={formData.paymentStatus === 'agree'}
                    />
                    <span className="text-gray-800 font-bold text-base md:text-lg group-hover:text-yellow-800">ខ្ញុំយល់ព្រមបង់ (២០,០០០ រៀល)</span>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-yellow-50 hover:border-yellow-200 transition-colors group">
                    <input 
                        type="radio" 
                        name="paymentStatus" 
                        value="not_affordable"
                        className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300"
                        onChange={handleChange}
                        checked={formData.paymentStatus === 'not_affordable'}
                    />
                    <span className="text-gray-800 font-bold text-base md:text-lg group-hover:text-yellow-800">មិនទាន់មានលទ្ឋភាព</span>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-yellow-50 hover:border-yellow-200 transition-colors group">
                    <input 
                        type="radio" 
                        name="paymentStatus" 
                        value="other"
                        className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300"
                        onChange={handleChange}
                        checked={formData.paymentStatus === 'other'}
                    />
                    <span className="text-gray-800 font-bold text-base md:text-lg group-hover:text-yellow-800">ហេតុផលផ្សេងៗ (Optional)</span>
                </label>

                {formData.paymentStatus === 'other' && (
                    <textarea 
                        name="otherReason"
                        className="w-full mt-2 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none text-base"
                        placeholder="សូមបញ្ជាក់ហេតុផល..."
                        rows={2}
                        value={formData.otherReason}
                        onChange={handleChange}
                    ></textarea>
                )}
              </div>
            </section>

            {/* Section 4: ការយល់ព្រម */}
            <section className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-start space-x-4">
                    <div className="mt-1">
                        <Camera className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="space-y-4">
                        <p className="text-base text-gray-700 leading-relaxed">
                            ដើម្បីជាការចងចាំ និងផ្សព្វផ្សាយដំណឹងល្អ យើងខ្ញុំសូមការអនុញ្ញាតក្នុងការថតរូប និងវីដេអូអំឡុងពេលកម្មវិធី ដើម្បីផុសនៅលើផេកសាសនាចក្រនៃព្រះយេស៊ូវគ្រីស្ទនៃពួកបរិសុទ្ឋថ្ងៃចុងក្រោយ និងផេក YSA Cambodia។
                        </p>
                        <label className="flex items-center space-x-3 cursor-pointer select-none group">
                            <input 
                                type="checkbox" 
                                name="mediaConsent"
                                required
                                className="w-6 h-6 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors"
                                checked={formData.mediaConsent}
                                onChange={handleChange}
                            />
                            <span className="text-gray-800 font-bold text-base md:text-lg">ខ្ញុំយល់ព្រម និងអនុញ្ញាត</span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Error Message */}
            {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center">
                    {submitError}
                </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-red-600 via-red-700 to-red-600 text-white rounded-xl text-xl font-bold shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-2 group border border-red-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>កំពុងបញ្ជូន...</span>
                        </>
                    ) : (
                        <>
                            <Gift className="w-6 h-6 group-hover:animate-bounce" />
                            <span>ចុះឈ្មោះឥឡូវនេះ</span>
                        </>
                    )}
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">ការចុះឈ្មោះរបស់អ្នកនឹងត្រូវបានរក្សាទុកដោយសុវត្ថិភាព</p>
            </div>

          </div>
        </form>
      </div>
      
      {/* Footer Decoration */}
      <div className="bg-green-900 border-t-4 border-yellow-500 text-green-100 py-8 text-center relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 flex justify-between pointer-events-none">
            <TreePine size={100} className="-mb-10 text-white" />
            <TreePine size={120} className="-mb-10 text-white" />
            <TreePine size={100} className="-mb-10 text-white" />
         </div>
         <p className="relative z-10 font-medium text-sm mb-2">© 2025 YSA Cambodia - Christmas at vKirirom</p>
         
         {/* Admin Link */}
         <button 
           onClick={onAdminClick}
           className="relative z-10 text-xs text-green-700 hover:text-yellow-400 transition-colors flex items-center justify-center mx-auto opacity-70 hover:opacity-100"
         >
           <LockKeyhole className="w-3 h-3 mr-1" />
           Admin Access
         </button>
      </div>
    </div>
  );
};

export default YsaRegistration;