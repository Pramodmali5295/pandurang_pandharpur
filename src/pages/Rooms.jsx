import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Search,  BedDouble, PieChart, CheckCircle2, Edit3, Trash2, Shield, Filter, X, User, ChevronDown } from 'lucide-react';

const Rooms = () => {
  const navigate = useNavigate();
  const { rooms, setRooms, allocations, customers, logActivity } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'AC',
    status: 'Available'
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = rooms.length;
    const booked = rooms.filter(r => r.status === 'Booked').length;
    const available = total - booked;
    const occupancy = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { total, booked, available, occupancy };
  }, [rooms]);

  const getActiveAllocation = (roomId) => {
    return allocations.find(a => {
      const isActive = a.status === 'Active' || a.status === undefined || a.status === null || a.status === '';
      if (!isActive) return false;
      const hasRoom = String(a.roomId) === String(roomId) || 
        (a.roomSelections && a.roomSelections.some(s => String(s.roomId) === String(roomId)));
      return hasRoom;
    });
  };

  const getFloorLabel = (roomNum) => {
    if (!roomNum) return 'Other';
    const cleanRoomNum = String(roomNum).trim().toUpperCase();
    
    // Extract prefix letters and numeric part
    const prefixMatch = cleanRoomNum.match(/^([A-Z]+)?(\d+)?/);
    const prefix = prefixMatch ? (prefixMatch[1] || '') : '';
    const numStr = prefixMatch ? (prefixMatch[2] || '') : '';
    const num = parseInt(numStr);

    // Ground Floor prefix always wins
    if (prefix === 'G') return 'Ground Floor';

    if (!isNaN(num)) {
      if (num >= 100) {
        const series = Math.floor(num / 100);
        switch(series) {
          case 1: return 'First Floor';
          case 2: return 'Second Floor';
          case 3: return 'Third Floor';
          case 4: return 'Fourth Floor';
          case 5: return 'Fifth Floor';
          case 6: return 'Sixth Floor';
          case 7: return 'Seventh Floor';
          case 8: return 'Eighth Floor';
          case 9: return 'Ninth Floor';
          case 10: return 'Tenth Floor';
          default: return `${series}th Floor`;
        }
      } else {
        // Double/single digit rooms with floor prefix (e.g. F1, F4, S2, S6, T3, T10, etc.)
        if (prefix === 'F') {
          if (num === 4) return 'Fourth Floor';
          if (num === 5) return 'Fifth Floor';
          return 'First Floor';
        }
        if (prefix === 'S') {
          if (num === 6) return 'Sixth Floor';
          if (num === 7) return 'Seventh Floor';
          return 'Second Floor';
        }
        if (prefix === 'T') {
          if (num === 10) return 'Tenth Floor';
          return 'Third Floor';
        }
        if (prefix === 'E' && num === 8) return 'Eighth Floor';
        if (prefix === 'N' && num === 9) return 'Ninth Floor';
        
        return 'Ground Floor';
      }
    }

    // Letter-only fallback
    if (prefix === 'F') return 'First Floor';
    if (prefix === 'S') return 'Second Floor';
    if (prefix === 'T') return 'Third Floor';

    return 'Other';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({ roomNumber: '', type: 'AC', status: 'Available' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Validation ---
    if (!formData.roomNumber.trim()) {
        alert("Room Number is required.");
        return;
    }

    // Check for duplicate Room Number
    const isDuplicate = rooms.some(r => 
        r.roomNumber.toString().trim().toLowerCase() === formData.roomNumber.toString().trim().toLowerCase() && 
        r.id !== editingId
    );

    if (isDuplicate) {
        alert("Room Number already exists! Please use a different number.");
        return;
    }

    // ------------------

    setIsSubmitting(true);
    try {
      if (editingId) {
        const roomRef = doc(db, "rooms", editingId);
        await updateDoc(roomRef, formData);
        setRooms(prev => prev.map(room => room.id === editingId ? { ...room, ...formData } : room));
        if (typeof logActivity === 'function') {
           logActivity('Edit Room', `Room ${formData.roomNumber} (${formData.type}) updated.`);
        }
      } else {
        const roomsCollection = collection(db, "rooms");
        await addDoc(roomsCollection, formData);
        if (typeof logActivity === 'function') {
           logActivity('Add Room', `Room ${formData.roomNumber} (${formData.type}) added.`);
        }
      }
      alert(editingId ? 'Room updated successfully!' : 'Room added successfully!');
      resetForm();
    } catch (error) {
      console.error("Firestore operation failed:", error);
      alert("Operation failed. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleEditRoom = (e, room) => {
    e.stopPropagation();

    setFormData({
      roomNumber: room.roomNumber,
      type: room.type,
      status: room.status
    });
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this room?')) {
       try {
         const roomRef = doc(db, "rooms", roomId);
         await deleteDoc(roomRef);
         setRooms(prev => prev.filter(r => r.id !== roomId));
         alert("Room deleted successfully");
       } catch (error) {
         console.error("Delete failed:", error);
         setRooms(prev => prev.filter(r => r.id !== roomId)); // Optimistic delete
       }
    }
  };



  const filteredRooms = rooms.filter(room => {
    const roomNumStr = room.roomNumber !== undefined && room.roomNumber !== null ? String(room.roomNumber) : '';
    const matchesSearch = roomNumStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || room.status === statusFilter;
    const matchesType = typeFilter === 'All' || room.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    const roomA = a.roomNumber !== undefined && a.roomNumber !== null ? String(a.roomNumber) : '';
    const roomB = b.roomNumber !== undefined && b.roomNumber !== null ? String(b.roomNumber) : '';
    
    const numA = parseInt(roomA.replace(/\D/g, '')) || 0;
    const numB = parseInt(roomB.replace(/\D/g, '')) || 0;
    
    if (numA !== numB) {
      return numA - numB;
    }
    return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="flex flex-col space-y-4 pb-8">
      
      {/* Top Section (Fixed) */}
      <div className="flex-none space-y-3">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Room Operations</h1>
             <p className="text-gray-500 text-sm mt-1">Manage inventory, prices, and maintenance statuses</p>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-sm transition-all"
              >
                <Plus size={16} /> Add Room
              </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
           <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between transform transition-all hover:scale-[1.02]">
               <div>
                  <p className="text-blue-100 text-xs font-black uppercase tracking-wider">Total Rooms</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
               </div>
               <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BedDouble size={24} className="text-white" />
               </div>
           </div>
           
           <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between transform transition-all hover:scale-[1.02]">
               <div>
                  <p className="text-emerald-100 text-xs font-black uppercase tracking-wider">Available Rooms</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.available}</p>
               </div>
               <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 size={24} className="text-white" />
               </div>
           </div>
           
           <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between transform transition-all hover:scale-[1.02]">
               <div>
                  <p className="text-rose-100 text-xs font-black uppercase tracking-wider">Booked Rooms</p>
                  <div className="flex items-baseline gap-2 mt-1">
                     <span className="text-3xl font-black text-white">{stats.booked}</span>
                     <span className="text-xs text-rose-100 font-bold opacity-80">/ {stats.total}</span>
                  </div>
               </div>
               <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <PieChart size={24} className="text-white" />
               </div>
           </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full lg:w-96 group">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by room number..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-sm font-medium outline-none transition-all" 
              />
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
                {/* Status Filter */}
                <div className="relative w-full lg:w-40">
                   <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   <select 
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer appearance-none transition-all"
                   >
                     <option value="All">All Status</option>
                     <option value="Available">Available</option>
                     <option value="Booked">Booked</option>
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown size={14} />
                   </div>
                </div>

                {/* Type Filter */}
                <div className="relative w-full lg:w-40">
                   <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   <select 
                     value={typeFilter}
                     onChange={(e) => setTypeFilter(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer appearance-none transition-all"
                   >
                     <option value="All">All Types</option>
                     <option value="AC">AC</option>
                     <option value="Non-AC">Non-AC</option>
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown size={14} />
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* Room Inventory Grid (Static) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
         <div>
              {(() => {
                 const groups = filteredRooms.reduce((acc, room) => {
                    const key = getFloorLabel(room.roomNumber);
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(room);
                    return acc;
                 }, {});

                 const floorOrder = [
                    'Ground Floor', 
                    'First Floor', 
                    'Second Floor', 
                    'Third Floor', 
                    'Fourth Floor', 
                    'Fifth Floor', 
                    'Sixth Floor', 
                    'Seventh Floor', 
                    'Eighth Floor', 
                    'Ninth Floor', 
                    'Tenth Floor'
                 ];
                 const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
                    const idxA = floorOrder.indexOf(a);
                    const idxB = floorOrder.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);  
                 });
                 
                 if (sortedGroups.length === 0) {
                     return (
                         <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Search size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">No rooms found.</p>
                         </div>
                     );
                 }

                 return sortedGroups.map(([floor, floorRooms]) => (
                    <div key={floor} className="mb-8 last:mb-0">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 sticky top-0 bg-white z-10 py-1">
                         <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                         {floor}
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {floorRooms.map((room) => {
                           const isAvailable = room.status === 'Available';
          
                           return (
                             <div 
                               key={room.id} 
                               onClick={() => setSelectedRoom(room)}
                               className={`group cursor-pointer rounded-xl w-16 h-16 transition-all hover:scale-105 shadow-sm flex flex-col items-center justify-center border p-2 text-center ${
                                  isAvailable 
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-100/30 hover:bg-emerald-600' 
                                    : 'bg-rose-500 border-rose-600 text-white shadow-rose-100/30 hover:bg-rose-600'
                               }`}
                             >
                                <h3 className="text-sm font-black leading-none tracking-tight">{room.roomNumber}</h3>
                                <span className="text-[9px] font-bold opacity-80 mt-1 uppercase tracking-wider">{room.type}</span>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                 ));
              })()}
         </div>
      </div>

      {/* Add/Edit Room Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
           {/* Card Container */}
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up transform transition-all">
             
             {/* Header */}
             <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
               <div>
                 <h2 className="text-lg font-bold">{editingId ? 'Edit Room' : 'New Room'}</h2>
                 <p className="text-indigo-200 text-xs mt-0.5">{editingId ? 'Update details' : 'Add to inventory'}</p>
               </div>
               <button onClick={resetForm} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                  <X size={18} />
               </button>
             </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Room Number</label>
                    <div className="relative">
                       <input 
                         type="text" 
                         name="roomNumber" 
                         value={formData.roomNumber} 
                         onChange={handleChange} 
                         className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg text-gray-800 transition-all placeholder:text-gray-300" 
                         placeholder="101" 
                         autoFocus
                         required 
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                          <BedDouble size={20} />
                       </div>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Room Type</label>
                    <div className="grid grid-cols-2 gap-3">
                       <label className={`cursor-pointer group relative overflow-hidden rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${formData.type === 'AC' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100'}`}>
                          <input type="radio" name="type" value="AC" checked={formData.type === 'AC'} onChange={handleChange} className="hidden" />
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${formData.type === 'AC' ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                              <span className="font-black text-xs">AC</span>
                          </span>
                          <span className="text-xs font-bold">Air Conditioned</span>
                          {formData.type === 'AC' && <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl pointer-events-none" />}
                       </label>
                       
                       <label className={`cursor-pointer group relative overflow-hidden rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${formData.type === 'Non-AC' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100'}`}>
                          <input type="radio" name="type" value="Non-AC" checked={formData.type === 'Non-AC'} onChange={handleChange} className="hidden" />
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${formData.type === 'Non-AC' ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                              <span className="font-black text-xs">NA</span>
                          </span>
                          <span className="text-xs font-bold">Non-AC</span>
                          {formData.type === 'Non-AC' && <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl pointer-events-none" />}
                       </label>
                    </div>
                 </div>
              </div>

              <div className="pt-2">
                 <button 
                   type="submit" 
                   disabled={isSubmitting} 
                   className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                 >
                   {isSubmitting ? 'Saving...' : (
                     <span className="flex items-center gap-2">
                       {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                       <span>{editingId ? 'Update Room' : 'Add Room'}</span>
                     </span>
                   )}
                 </button>
              </div>
            </form>
           </div>
        </div>,
        document.body
      )}

      {/* Room Details Modal - Styled like Ad Card */}
      {selectedRoom && createPortal(
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
             
             {/* Card Container */ }
             <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up transform transition-all">
                
                {/* Header */}
                <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
                   <div>
                      <h2 className="text-lg font-bold">Room {selectedRoom.roomNumber}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-indigo-200 text-xs">Room Details</span>
                      </div>
                   </div>
                   <button onClick={() => setSelectedRoom(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={18} /></button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                   
                   {/* Status & Type Badges */}
                   <div className="flex gap-3">
                       <div className={`flex-1 rounded-xl p-3 border-2 flex flex-col items-center justify-center gap-1 ${selectedRoom.type === 'AC' ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Type</span>
                          <span className="font-bold text-sm">{selectedRoom.type}</span>
                       </div>
                       <div className={`flex-1 rounded-xl p-3 border-2 flex flex-col items-center justify-center gap-1 ${selectedRoom.status === 'Available' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                          <span className="font-bold text-sm">{selectedRoom.status}</span>
                       </div>
                   </div>

                   {/* Occupancy Details (If Booked) */}
                   {selectedRoom.status === 'Booked' && (() => {
                      const activeAlloc = getActiveAllocation(selectedRoom.id);
                      const customer = activeAlloc ? customers.find(c => String(c.id) === String(activeAlloc.customerId)) : null;
                      return activeAlloc ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3">
                             <div className="flex items-center gap-3 border-b border-rose-200/50 pb-3">
                                <div className="bg-rose-200 p-2 rounded-full text-rose-700 shrink-0">
                                   <User size={16} />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[10px] uppercase font-bold text-rose-400">Guest Name</p>
                                   <p className="font-bold text-rose-900 text-sm truncate">{customer ? customer.name : 'Unknown Guest'}</p>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3 text-xs">
                                {customer?.phone && (
                                   <div>
                                      <p className="text-rose-400 font-bold mb-0.5">Contact Number</p>
                                      <p className="text-rose-800 font-medium">{customer.phone}</p>
                                   </div>
                                )}
                                {customer?.idProof && (
                                   <div>
                                      <p className="text-rose-400 font-bold mb-0.5">ID Proof</p>
                                      <p className="text-rose-800 font-medium truncate" title={customer.idProof}>{customer.idProof}</p>
                                   </div>
                                )}
                                {customer?.companyName && (
                                   <div>
                                      <p className="text-rose-400 font-bold mb-0.5">Company Name</p>
                                      <p className="text-rose-800 font-medium truncate" title={customer.companyName}>{customer.companyName}</p>
                                   </div>
                                )}
                                {customer?.gstin && (
                                   <div>
                                      <p className="text-rose-400 font-bold mb-0.5">GSTIN</p>
                                      <p className="text-rose-800 font-medium">{customer.gstin}</p>
                                   </div>
                                )}
                                <div className="col-span-2">
                                   <p className="text-rose-400 font-bold mb-0.5">Address</p>
                                   <p className="text-rose-800 font-medium whitespace-pre-wrap">{customer?.address || 'N/A'}</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Check In</p>
                                   <p className="text-rose-800 font-medium">{(() => {
                                      const d = new Date(activeAlloc.checkIn);
                                      if (isNaN(d.getTime())) return '---';
                                      let hrs = d.getHours();
                                      const mins = String(d.getMinutes()).padStart(2, '0');
                                      const ampm = hrs >= 12 ? 'PM' : 'AM';
                                      hrs = hrs % 12;
                                      hrs = hrs ? hrs : 12;
                                      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
                                   })()}</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Check Out</p>
                                   <p className="text-rose-800 font-medium">{(() => {
                                      const d = new Date(activeAlloc.checkOut);
                                      if (isNaN(d.getTime())) return '---';
                                      let hrs = d.getHours();
                                      const mins = String(d.getMinutes()).padStart(2, '0');
                                      const ampm = hrs >= 12 ? 'PM' : 'AM';
                                      hrs = hrs % 12;
                                      hrs = hrs ? hrs : 12;
                                      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
                                   })()}</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Stay Duration</p>
                                   <p className="text-rose-800 font-medium">{activeAlloc.stayDuration || 1} Night(s)</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Booking Source</p>
                                   <p className="text-rose-800 font-medium">{activeAlloc.bookingPlatform || 'Counter'}</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Total Price</p>
                                   <p className="text-rose-900 font-bold">₹{(activeAlloc.price || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                   <p className="text-rose-400 font-bold mb-0.5">Remaining Balance</p>
                                   <p className={`font-bold ${Number(activeAlloc.remainingAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      ₹{(Number(activeAlloc.remainingAmount) || 0).toLocaleString('en-IN')}
                                   </p>
                                </div>
                             </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                           Checking allocation details...
                        </div>
                      );
                   })()}

                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    {selectedRoom.status === 'Booked' && (
                        <button 
                            onClick={async () => {
                                if(window.confirm("WARNING: This room is currently marked as 'Booked'. Forcing it to 'Available' should only be done if the guest has actually left and the system failed to update. This will NOT update the guest's billing record.\n\nContinue?")) {
                                    try {
                                        const roomRef = doc(db, "rooms", selectedRoom.id);
                                        await updateDoc(roomRef, { status: 'Available' });
                                        setSelectedRoom(null);
                                        alert("Room status updated to Available.");
                                    } catch (err) {
                                        alert("Failed to update status.");
                                    }
                                }
                            }}
                            className="flex-1 py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-xl transition-all shadow-sm text-sm flex justify-center items-center gap-2 border border-amber-200"
                        >
                            <CheckCircle2 size={16} /> Force Available
                        </button>
                    )}
                    {selectedRoom.status === 'Available' && (
                        <button 
                            onClick={() => {
                                const roomNum = selectedRoom.roomNumber;
                                const roomId = selectedRoom.id;
                                const roomType = selectedRoom.type;
                                setSelectedRoom(null);
                                navigate('/add-booking', { state: { roomId, roomNumber: roomNum, roomType } });
                            }}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm text-sm flex justify-center items-center gap-2"
                        >
                            <Plus size={16} /> Book Now
                        </button>
                    )}
                    <button 
                         onClick={(e) => { 
                             if (selectedRoom.status === 'Booked' && !window.confirm("This room is currently BOOKED. Editing its details might cause confusion. Continue?")) return;
                             const roomToEdit = selectedRoom;
                             setSelectedRoom(null); 
                             handleEditRoom(e, roomToEdit); 
                         }}
                         className={`flex-1 py-3 font-bold rounded-xl shadow-sm transition-all text-sm flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white`}
                      >
                         <Edit3 size={16} /> Edit
                    </button>

                    <button 
                        onClick={(e) => {
                            const roomId = selectedRoom.id; 
                            setSelectedRoom(null); 
                            handleDeleteRoom(e, roomId); 
                        }} 
                        className="flex-1 py-3 bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold rounded-xl transition-all shadow-sm text-sm flex justify-center items-center gap-2"
                    >
                       <Trash2 size={16} /> Delete
                    </button>
                </div>

             </div>
         </div>,
         document.body
      )}



      {/* Animation Styles */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in-down {
          animation: slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Rooms;
