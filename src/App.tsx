import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Scan, 
  Ticket as TicketIcon, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  LogOut,
  User,
  Phone,
  Hash,
  IndianRupee,
  QrCode,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { db, auth } from './lib/firebase';
import { cn, generateTicketId } from './lib/utils';

// --- Types ---

interface Ticket {
  id: string;
  docId?: string;
  customerName: string;
  mobileNumber: string;
  ticketCount: number;
  amountPaid: number;
  status: 'issued' | 'checked';
  createdAt: any;
  checkedAt?: any;
}

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'scan'>('create');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showTicket, setShowTicket] = useState<Ticket | null>(null);

  // Real-time Tickets Listener
  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as Ticket[];
      setTickets(ticketData);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414] p-4 md:p-6 flex justify-between items-center bg-white">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Marshian Bhajan Club</h1>
          <p className="text-xs font-mono opacity-60">Ticket System</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">Public Access</p>
            <p className="text-xs font-mono text-green-600">● Live</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-[#141414] text-white p-3 flex justify-center gap-8 text-xs font-mono uppercase tracking-widest">
        <span>Total Issued: {tickets.length}</span>
        <span>Checked: {tickets.filter(t => t.status === 'checked').length}</span>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Tabs */}
        <div className="flex border border-[#141414] mb-8 overflow-hidden rounded-lg bg-white">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-all",
              activeTab === 'create' ? "bg-[#141414] text-white" : "hover:bg-gray-50"
            )}
          >
            <PlusCircle size={20} />
            <span>Create Ticket</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-all",
              activeTab === 'scan' ? "bg-[#141414] text-white" : "hover:bg-gray-50"
            )}
          >
            <Scan size={20} />
            <span>Verify Ticket</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <CreateTicketTab key="create" onTicketCreated={(t) => setShowTicket(t)} />
          ) : (
            <ScanTicketTab key="scan" />
          )}
        </AnimatePresence>
      </main>

      {/* Ticket Modal */}
      <AnimatePresence>
        {showTicket && (
          <TicketModal ticket={showTicket} onClose={() => setShowTicket(null)} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto p-8 text-center border-t border-[#141414] opacity-40 text-xs font-mono uppercase tracking-widest">
        &copy; 2024 Marshian Bhajan Club &bull; Secure Ticketing System
      </footer>
    </div>
  );
}

// --- Sub-components ---

function CreateTicketTab({ onTicketCreated, key }: { onTicketCreated: (t: Ticket) => void, key?: string }) {
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    ticketCount: 1,
    amountPaid: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const ticketId = generateTicketId();
    const newTicket: Ticket = {
      id: ticketId,
      customerName: formData.customerName,
      mobileNumber: formData.mobileNumber,
      ticketCount: Number(formData.ticketCount),
      amountPaid: Number(formData.amountPaid),
      status: 'issued',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'tickets'), newTicket);
      onTicketCreated({ ...newTicket, createdAt: new Date() });
      setFormData({ customerName: '', mobileNumber: '', ticketCount: 1, amountPaid: 0 });
    } catch (err) {
      console.error("Error creating ticket:", err);
      alert("Failed to create ticket. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white border border-[#141414] p-6 md:p-8 rounded-lg shadow-sm"
    >
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
        <PlusCircle size={24} />
        Issue New Ticket
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase flex items-center gap-2">
            <User size={14} /> Customer Name
          </label>
          <input
            type="text"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full p-3 border border-gray-200 focus:border-[#141414] outline-none rounded"
            placeholder="Enter full name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase flex items-center gap-2">
            <Phone size={14} /> Mobile Number
          </label>
          <input
            type="tel"
            required
            pattern="[0-9]{10}"
            value={formData.mobileNumber}
            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            className="w-full p-3 border border-gray-200 focus:border-[#141414] outline-none rounded"
            placeholder="10-digit number"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase flex items-center gap-2">
            <Hash size={14} /> Number of Tickets
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.ticketCount}
            onChange={(e) => setFormData({ ...formData, ticketCount: parseInt(e.target.value) })}
            className="w-full p-3 border border-gray-200 focus:border-[#141414] outline-none rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase flex items-center gap-2">
            <IndianRupee size={14} /> Amount Paid (₹)
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.amountPaid}
            onChange={(e) => setFormData({ ...formData, amountPaid: parseInt(e.target.value) })}
            className="w-full p-3 border border-gray-200 focus:border-[#141414] outline-none rounded"
          />
        </div>

        <div className="md:col-span-2 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Generating...' : (
              <>
                <TicketIcon size={20} />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ScanTicketTab({ key }: { key?: string }) {
  const [ticketId, setTicketId] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    ticket?: Ticket;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketId) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const q = query(collection(db, 'tickets'), where('id', '==', ticketId.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setVerificationResult({
          success: false,
          message: "Ticket not found. Please check the code."
        });
      } else {
        const docSnap = querySnapshot.docs[0];
        const ticket = { ...docSnap.data(), docId: docSnap.id } as Ticket;

        if (ticket.status === 'checked') {
          setVerificationResult({
            success: false,
            message: "ALREADY CHECKED",
            ticket
          });
        } else {
          // Mark as checked
          await updateDoc(doc(db, 'tickets', docSnap.id), {
            status: 'checked',
            checkedAt: serverTimestamp()
          });
          setVerificationResult({
            success: true,
            message: "VERIFIED SUCCESSFULLY",
            ticket: { ...ticket, status: 'checked' }
          });
        }
      }
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationResult({
        success: false,
        message: "Error verifying ticket. Check connection."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white border border-[#141414] p-6 md:p-8 rounded-lg shadow-sm"
    >
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
        <QrCode size={24} />
        Verify Ticket
      </h2>

      <div className="space-y-6">
        <form onSubmit={handleVerify} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value.toUpperCase())}
              className="w-full p-4 pl-10 border border-gray-200 focus:border-[#141414] outline-none rounded font-mono"
              placeholder="ENTER UNIQUE CODE (e.g. A1B2C3D4)"
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying || !ticketId}
            className="bg-[#141414] text-white px-8 font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            Verify
          </button>
        </form>

        <AnimatePresence>
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 border-2 rounded-lg flex flex-col items-center text-center gap-4",
                verificationResult.success 
                  ? "bg-green-50 border-green-500 text-green-800" 
                  : "bg-red-50 border-red-500 text-red-800"
              )}
            >
              {verificationResult.success ? (
                <CheckCircle2 size={48} className="text-green-500" />
              ) : (
                <AlertCircle size={48} className="text-red-500" />
              )}
              
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  {verificationResult.message}
                </h3>
                {verificationResult.ticket && (
                  <div className="mt-4 p-4 bg-white/50 rounded border border-current/10 text-left space-y-1 font-mono text-sm">
                    <p><strong>NAME:</strong> {verificationResult.ticket.customerName}</p>
                    <p><strong>MOBILE:</strong> {verificationResult.ticket.mobileNumber}</p>
                    <p><strong>TICKETS:</strong> {verificationResult.ticket.ticketCount}</p>
                    <p><strong>AMOUNT:</strong> ₹{verificationResult.ticket.amountPaid}</p>
                    <p><strong>CODE:</strong> {verificationResult.ticket.id}</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setVerificationResult(null);
                  setTicketId('');
                }}
                className="mt-2 text-xs uppercase font-bold tracking-widest underline opacity-60 hover:opacity-100"
              >
                Clear Results
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
          <p className="text-sm opacity-60 italic">
            Tip: You can also use a QR scanner app to scan the ticket QR code. 
            It will contain the unique code for manual entry here.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TicketModal({ ticket, onClose }: { ticket: Ticket, onClose: () => void }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadTicket = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `Ticket-${ticket.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold uppercase tracking-tight">E-Ticket Generated</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh]">
          {/* The Actual Ticket Design */}
          <div 
            ref={ticketRef}
            className="bg-white border-2 border-[#141414] p-6 rounded-lg relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#141414]"></div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#141414]"></div>
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Marshian Bhajan Club</h2>
                <p className="text-[10px] font-mono uppercase opacity-60 mt-1">Official Event Ticket</p>
              </div>
              <div className="text-right">
                <span className="bg-[#141414] text-white text-[10px] px-2 py-1 font-mono uppercase">Original</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex-1 space-y-4 w-full">
                <div className="border-l-2 border-[#141414] pl-4">
                  <p className="text-[10px] font-mono uppercase opacity-50">Customer Name</p>
                  <p className="text-lg font-bold uppercase">{ticket.customerName}</p>
                </div>
                <div className="border-l-2 border-[#141414] pl-4">
                  <p className="text-[10px] font-mono uppercase opacity-50">Mobile Number</p>
                  <p className="text-lg font-bold font-mono">{ticket.mobileNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-l-2 border-[#141414] pl-4">
                    <p className="text-[10px] font-mono uppercase opacity-50">Tickets</p>
                    <p className="text-lg font-bold">{ticket.ticketCount}</p>
                  </div>
                  <div className="border-l-2 border-[#141414] pl-4">
                    <p className="text-[10px] font-mono uppercase opacity-50">Amount Paid</p>
                    <p className="text-lg font-bold">₹{ticket.amountPaid}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <QRCodeSVG 
                  value={ticket.id} 
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-center">
                  <p className="text-[10px] font-mono uppercase opacity-50">Unique Code</p>
                  <p className="text-sm font-bold font-mono tracking-widest">{ticket.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-gray-300 flex justify-between items-end">
              <div className="text-[8px] font-mono uppercase opacity-40 max-w-[200px]">
                This ticket is valid for one-time entry only. Please present this QR code at the entrance for verification.
              </div>
              <div className="text-[10px] font-mono font-bold">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex gap-3">
          <button
            onClick={downloadTicket}
            disabled={isDownloading}
            className="flex-1 bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} />
            {isDownloading ? 'Preparing...' : 'Download Ticket'}
          </button>
          <button
            onClick={onClose}
            className="px-6 border border-[#141414] font-bold uppercase tracking-widest hover:bg-white transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
