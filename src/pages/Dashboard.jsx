import { BedDouble, Users, CheckCircle, Sparkles, TrendingUp, Calendar, IndianRupee, LogIn, LogOut, CreditCard, LayoutDashboard, CalendarRange, Download } from 'lucide-react';
import { Link } from 'react-router-dom'; // Assuming Link is from react-router-dom
import React, { useMemo, useState } from 'react'; // Assuming React and useMemo are imported
import { useAppContext } from '../context/AppContext'; // Assuming useAppContext is imported

const StatCard = ({ title, value, icon, gradient, link, border }) => (
  <Link to={link || '#'} className={`group ${gradient} p-5 rounded-xl shadow-lg ${border} text-white flex items-center justify-between transform transition-all hover:scale-[1.02] hover:shadow-xl duration-300`}>
    <div>
      <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black mt-1 text-white">{value}</p>
    </div>
    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner group-hover:bg-white/30 transition-all">
      {React.cloneElement(icon, { size: 24, className: "text-white" })}
    </div>
  </Link>
);



const Dashboard = () => {
  const { rooms, employees, allocations, customers } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReportYear, setSelectedReportYear] = useState(() => new Date().getFullYear().toString());
  const [selectedReportMonth, setSelectedReportMonth] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const handleExportCSV = () => {
    if (!exportStartDate || !exportEndDate) {
      alert("Please select both start date and end date for the CSV export.");
      return;
    }

    const start = new Date(exportStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(exportEndDate);
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      alert("Start Date must be before or equal to End Date.");
      return;
    }

    const filtered = allocations.filter(alloc => {
      if (alloc.status === 'Cancelled') return false;
      if (!alloc.checkIn) return false;

      const checkInDate = new Date(alloc.checkIn);
      return !isNaN(checkInDate.getTime()) && checkInDate >= start && checkInDate <= end;
    });

    if (filtered.length === 0) {
      alert("No transaction records found in the selected date range.");
      return;
    }

    filtered.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    const headers = [
      "Guest Name",
      "Room Number(s)",
      "Payment Mode",
      "Check-In Date",
      "Check-Out Date",
      "Status",
      "Collected Amount (INR)",
      "Pending Amount (INR)",
      "Total Price (INR)"
    ];

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map(alloc => {
      const guestName = customers.find(c => String(c.id) === String(alloc.customerId))?.name || 'Unknown Guest';
      
      let roomsLabel = '';
      if (alloc.roomSelections && Array.isArray(alloc.roomSelections)) {
        roomsLabel = alloc.roomSelections.map(sel => {
          const rm = rooms.find(r => String(r.id) === String(sel.roomId));
          return rm ? rm.roomNumber : '';
        }).filter(Boolean).join(', ');
      } else if (alloc.roomId) {
        const rm = rooms.find(r => String(r.id) === String(alloc.roomId));
        roomsLabel = rm ? rm.roomNumber : '';
      }

      return [
        escapeCsv(guestName),
        escapeCsv(roomsLabel || 'N/A'),
        escapeCsv(alloc.paymentType || 'Cash'),
        escapeCsv(alloc.checkIn ? new Date(alloc.checkIn).toLocaleString('en-IN') : 'N/A'),
        escapeCsv(alloc.actualCheckOut || alloc.checkOut ? new Date(alloc.actualCheckOut || alloc.checkOut).toLocaleString('en-IN') : 'N/A'),
        escapeCsv(alloc.status || 'Active'),
        Number(alloc.advanceAmount || 0),
        Number(alloc.remainingAmount || 0),
        Number(alloc.price || 0)
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Collections_Report_${exportStartDate}_to_${exportEndDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Revenue / Collection calculations for month-wise & year-wise reports
  const revenueReport = useMemo(() => {
    let lifetimeCollected = 0;
    let pendingCollected = 0;
    const yearly = {};
    const monthly = {};
    const daily = {};

    allocations.forEach(alloc => {
      if (alloc.status === 'Cancelled') return;

      const advance = Number(alloc.advanceAmount) || 0;
      const remaining = Number(alloc.remainingAmount) || 0;

      lifetimeCollected += advance;
      
      if (alloc.status === 'Active' || alloc.status === 'Reserved' || !alloc.status) {
        pendingCollected += remaining;
      }

      if (!alloc.checkIn) return;
      const checkInDate = new Date(alloc.checkIn);
      if (isNaN(checkInDate.getTime())) return;

      const yearStr = checkInDate.getFullYear().toString();
      const monthStr = (checkInDate.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = checkInDate.getDate().toString().padStart(2, '0');
      const monthKey = `${yearStr}-${monthStr}`;
      const dayKey = `${yearStr}-${monthStr}-${dayStr}`;
      const paymentType = alloc.paymentType || 'Cash';

      yearly[yearStr] = (yearly[yearStr] || 0) + advance;

      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          total: 0,
          breakdown: {}
        };
      }
      monthly[monthKey].total += advance;
      monthly[monthKey].breakdown[paymentType] = (monthly[monthKey].breakdown[paymentType] || 0) + advance;

      if (!daily[dayKey]) {
        daily[dayKey] = {
          total: 0,
          breakdown: {}
        };
      }
      daily[dayKey].total += advance;
      daily[dayKey].breakdown[paymentType] = (daily[dayKey].breakdown[paymentType] || 0) + advance;
    });

    const currentYear = new Date().getFullYear().toString();
    const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const currentYearCollected = yearly[currentYear] || 0;
    const currentMonthCollected = monthly[currentMonth]?.total || 0;
    const todayCollected = daily[todayStr]?.total || 0;

    return {
      lifetimeCollected,
      pendingCollected,
      currentYearCollected,
      currentMonthCollected,
      todayCollected,
      yearly,
      monthly,
      daily
    };
  }, [allocations]);

  // Calculations for a specific date search
  const dateRevenue = useMemo(() => {
    if (!filterDate) return null;
    
    const targetDate = new Date(filterDate);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    let total = 0;
    const breakdown = {};
    const bookings = [];

    allocations.forEach(alloc => {
      if (alloc.status === 'Cancelled') return;
      if (!alloc.checkIn) return;

      const checkInDate = new Date(alloc.checkIn);
      if (isNaN(checkInDate.getTime())) return;

      if (checkInDate >= targetDate && checkInDate < nextDate) {
        const advance = Number(alloc.advanceAmount) || 0;
        total += advance;
        const paymentType = alloc.paymentType || 'Cash';
        breakdown[paymentType] = (breakdown[paymentType] || 0) + advance;
        
        const guestName = customers.find(c => String(c.id) === String(alloc.customerId))?.name || 'Unknown Guest';
        
        let roomsLabel = '';
        if (alloc.roomSelections && Array.isArray(alloc.roomSelections)) {
          roomsLabel = alloc.roomSelections.map(sel => {
            const rm = rooms.find(r => String(r.id) === String(sel.roomId));
            return rm ? rm.roomNumber : '';
          }).filter(Boolean).join(', ');
        } else if (alloc.roomId) {
          const rm = rooms.find(r => String(r.id) === String(alloc.roomId));
          roomsLabel = rm ? rm.roomNumber : '';
        }

        bookings.push({
          id: alloc.id,
          guestName,
          rooms: roomsLabel || 'N/A',
          amount: advance,
          paymentType,
          checkIn: alloc.checkIn,
          status: alloc.status || 'Active'
        });
      }
    });

    return { total, breakdown, bookings };
  }, [allocations, filterDate, customers, rooms]);

  // 15-Day Matrix Dates
  const calendarDates = useMemo(() => {
    const list = [];
    const baseDate = calendarStartDate ? new Date(calendarStartDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 15; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      list.push(d);
    }
    return list;
  }, [calendarStartDate]);

  const getBookingForRoomAndDay = (roomId, date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return allocations.find(a => {
      if (a.status !== 'Reserved') return false;
      const matchesRoom = String(a.roomId) === String(roomId) || (a.roomSelections && a.roomSelections.some(sel => String(sel.roomId) === String(roomId)));
      if (!matchesRoom) return false;

      const checkInTime = new Date(a.checkIn);
      const checkOutTime = new Date(a.actualCheckOut || a.checkOut);
      return checkInTime <= dayEnd && checkOutTime >= dayStart;
    });
  };

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'Available').length;
    const occupied = rooms.filter(r => r.status === 'Booked').length;
    const activeStays = allocations.filter(a => a.status === 'Active' || !a.status).length;
    const totalStaff = employees.filter(e => e.status !== 'Inactive').length;
    const totalGuests = customers.length;
    
    return { total, available, occupied, activeStays, totalStaff, totalGuests };
  }, [rooms, allocations, employees, customers]);

  const recentStays = useMemo(() => {
    return allocations
      .filter(a => a.status === 'Active' || a.status === 'Reserved' || !a.status)
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  }, [allocations]);

  const getCustomerName = (id) => customers.find(c => String(c.id) === String(id))?.name || 'Unknown Guest';
  const getCustomerPhone = (id) => customers.find(c => String(c.id) === String(id))?.phone || 'N/A';
  const getRoomNumber = (id) => rooms.find(r => String(r.id) === String(id))?.roomNumber || 'N/A';
  const getRoomType = (id) => rooms.find(r => String(r.id) === String(id))?.type || 'Unknown';

  const roomBreakdown = useMemo(() => {
     const data = { 
         AC: { total: 0, available: 0, occupied: 0 }, 
         'Non-AC': { total: 0, available: 0, occupied: 0 } 
     };
     
     rooms.forEach(r => { 
        const type = r.type;
        if(data[type]) {
            data[type].total++;
            if (r.status === 'Booked') {
                data[type].occupied++;
            } else {
                data[type].available++;
            }
        }
     });
     return data;
  }, [rooms]);

  // Compute active assigned rooms from Allocations
  const employeeRoomMap = useMemo(() => {
    const map = {};
    if (!allocations || !rooms) return map;

    allocations.forEach(alloc => {
      // Check for active status
      const isActive = alloc.status === 'Active' || !alloc.status;
      if (isActive && alloc.employeeId) {
        if (!map[alloc.employeeId]) {
          map[alloc.employeeId] = new Set();
        }
        
        // Get rooms from this allocation
        if (alloc.roomSelections && Array.isArray(alloc.roomSelections)) {
             alloc.roomSelections.forEach(sel => {
                 const room = rooms.find(r => String(r.id) === String(sel.roomId));
                 if (room) map[alloc.employeeId].add(room.roomNumber);
             });
        } else if (alloc.roomId) {
             // Backward compatibility
             const room = rooms.find(r => String(r.id) === String(alloc.roomId));
             if (room) map[alloc.employeeId].add(room.roomNumber);
        }
      }
    });

    // Convert Sets to Arrays
    Object.keys(map).forEach(empId => {
        map[empId] = Array.from(map[empId]).sort((a,b) => {
             // Try numeric sort
             const numA = parseInt(a.replace(/\D/g, '')) || 0;
             const numB = parseInt(b.replace(/\D/g, '')) || 0;
             return numA - numB;
        });
    });
    
    return map;
  }, [allocations, rooms]);

  // Daily Report Calculations
  const dailyReport = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter today's allocations
    const todayAllocations = allocations.filter(alloc => {
      const checkInDate = new Date(alloc.checkIn);
      return checkInDate >= today && checkInDate < tomorrow;
    });

    // Check-outs today
    const todayCheckOuts = allocations.filter(alloc => {
      if (!alloc.actualCheckOut && !alloc.checkOut) return false;
      const checkOutDate = new Date(alloc.actualCheckOut || alloc.checkOut);
      return checkOutDate >= today && checkOutDate < tomorrow && alloc.status === 'Checked-Out';
    });

    // Revenue calculations
    const todayRevenue = todayAllocations.reduce((sum, alloc) => {
      return sum + (Number(alloc.advanceAmount) || 0);
    }, 0);

    const todayTotalBilling = todayAllocations.reduce((sum, alloc) => {
      return sum + (Number(alloc.price) || 0);
    }, 0);

    const todayPending = todayTotalBilling - todayRevenue;

    // Payment type breakdown for today
    const paymentBreakdown = todayAllocations.reduce((acc, alloc) => {
      const type = alloc.paymentType || 'Cash';
      const amount = Number(alloc.advanceAmount) || 0;
      acc[type] = (acc[type] || 0) + amount;
      return acc;
    }, {});

    // Add Pending Collection if any
    if (todayPending > 0) {
      paymentBreakdown['Pending'] = todayPending;
    }

    // Occupancy rate
    const occupancyRate = rooms.length > 0 ? ((stats.occupied / rooms.length) * 100).toFixed(1) : 0;

    return {
      checkIns: todayAllocations.length,
      checkOuts: todayCheckOuts.length,
      revenue: todayRevenue,
      totalBilling: todayTotalBilling,
      pending: todayPending,
      paymentBreakdown,
      occupancyRate,
      todayAllocations
    };
  }, [allocations, rooms, stats.occupied]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-gray-50/50 backdrop-blur-md pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">System Overview</h1>
            <p className="text-gray-500 text-sm font-medium">Real-time hospitality management operations</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">Live Monitor</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <LayoutDashboard size={14} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <CalendarRange size={14} /> Booking Calendar
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'collections'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <IndianRupee size={14} /> Collections Report
        </button>

      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Rooms" 
          value={stats.total} 
          icon={<BedDouble />} 
          gradient="bg-gradient-to-br from-gray-700 to-gray-800"
          border="border-gray-500"
          link="/rooms"
        />
        <StatCard 
          title="Booked Rooms" 
          value={stats.occupied} 
          icon={<CheckCircle />} 
          gradient="bg-gradient-to-br from-rose-500 to-rose-600"
          border="border-rose-400"
          link="/allocations"
        />
        <StatCard 
          title="Available Rooms" 
          value={stats.available} 
          icon={<Sparkles />} 
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          border="border-emerald-400"
          link="/rooms"
        />
        <StatCard 
          title="Total Staff" 
          value={stats.totalStaff} 
          icon={<Users />} 
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          border="border-amber-400"
          link="/employees"
        />
      </div>

      {/* Daily Report Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg border border-blue-400/20 overflow-hidden">
        <div className="p-3 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <Calendar size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Daily Report</h2>
              <p className="text-blue-100 text-[9px] font-bold mt-0.5">{(() => {
                const d = new Date();
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
              })()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-md backdrop-blur-sm border border-white/20">
            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-[9px] font-black text-white uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Check-ins Today */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-md group-hover:bg-emerald-500/30 transition-all">
                <LogIn size={14} className="text-emerald-300" />
              </div>
              <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">Check-ins</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-white">{dailyReport.checkIns}</h3>
              <span className="text-[10px] font-bold text-white/70">Today</span>
            </div>
          </div>

          {/* Check-outs Today */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-rose-500/20 rounded-md group-hover:bg-rose-500/30 transition-all">
                <LogOut size={14} className="text-rose-300" />
              </div>
              <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">Check-outs</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-white">{dailyReport.checkOuts}</h3>
              <span className="text-[10px] font-bold text-white/70">Today</span>
            </div>
          </div>

          {/* Revenue Collected */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-green-500/20 rounded-md group-hover:bg-green-500/30 transition-all">
                <IndianRupee size={14} className="text-green-300" />
              </div>
              <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">Collected Amount</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-white">₹{Math.round(dailyReport.revenue).toLocaleString('en-IN')}</h3>
              <p className="text-[9px] font-bold text-white/50 mt-0.5">of ₹{Math.round(dailyReport.totalBilling).toLocaleString('en-IN')}</p>
            </div>
          </div>


          {/* Occupied Rooms */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-amber-500/20 rounded-md group-hover:bg-amber-500/30 transition-all">
                <BedDouble size={14} className="text-amber-300" />
              </div>
              <span className="text-[9px] font-black text-white/60 uppercase tracking-wider">Occupied Rooms</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-white">{stats.occupied}</h3>
              <span className="text-[10px] font-bold text-white/70">Rooms</span>
            </div>
            <p className="text-[9px] font-bold text-white/50 mt-0.5">of {stats.total} total</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        {Object.keys(dailyReport.paymentBreakdown).length > 0 && (
          <div className="px-3 pb-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard size={12} className="text-white/80" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-wider">Payment Breakdown</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(dailyReport.paymentBreakdown)
                  .sort(([a], [b]) => {
                    // Sort Cash first, then Pending, then others
                    if (a === 'Cash') return -1;
                    if (b === 'Cash') return 1;
                    if (a === 'Pending') return -1;
                    if (b === 'Pending') return 1;
                    return a.localeCompare(b);
                  })
                  .map(([type, amount]) => (
                  <div key={type} className="bg-white/5 rounded-md p-2 border border-white/10">
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-wide mb-0.5">
                      {type === 'Pending' ? 'Pending Collection' : type}
                    </p>
                    <p className="text-base font-black text-white">₹{Math.round(amount).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Guest Activity */}
         <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col h-[280px] border-t-4 border-t-indigo-500">
                <div className="p-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50 flex-shrink-0">
                   <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Customer Activity</h3>
                      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-sm shadow-indigo-100">{recentStays.length}</div>
                   </div>
                   <Link to="/customers" className="text-[9px] font-black text-white hover:bg-indigo-700 uppercase tracking-widest px-2.5 py-1.5 bg-indigo-600 rounded-lg shadow-md shadow-indigo-100 transition-all flex items-center gap-1">
                      Ledger <TrendingUp size={10} />
                   </Link>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100/80 text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 sticky top-0 bg-gray-100 z-10 backdrop-blur-md">
                          <th className="px-5 py-2">Profile</th>
                          <th className="px-5 py-2">Room</th>
                          <th className="px-5 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recentStays.map(alloc => (
                          <tr key={alloc.id} className="group hover:bg-indigo-50/30 transition-all">
                            <td className="px-5 py-3">
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate max-w-[120px]">{getCustomerName(alloc.customerId)}</span>
                                  <span className="text-[8px] font-bold text-gray-400 uppercase">IN: {(() => {
                                      const d = new Date(alloc.checkIn);
                                      let hrs = d.getHours();
                                      const mins = String(d.getMinutes()).padStart(2, '0');
                                      const ampm = hrs >= 12 ? 'PM' : 'AM';
                                      hrs = hrs % 12;
                                      hrs = hrs ? hrs : 12;
                                      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
                                  })()}</span>
                               </div>
                            </td>
                            <td className="px-5 py-3">
                               <div className="flex flex-col">
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase w-fit border border-indigo-100 shadow-sm">{getRoomNumber(alloc.roomId)}</span>
                                  <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">{getRoomType(alloc.roomId)}</span>
                                </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                               <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border shadow-sm ${
                                  alloc.status === 'Checked-Out' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                  : alloc.status === 'Reserved'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse-slow'
                               }`}>
                                  {alloc.status === 'Checked-Out' ? 'DONE' : alloc.status === 'Reserved' ? 'RESERVED' : 'LIVE'}
                               </span>
                            </td>
                          </tr>
                        ))}
                        {allocations.length === 0 && (
                           <tr><td colSpan="3" className="px-6 py-20 text-center text-gray-400 font-bold italic">No allocation data available</td></tr>
                        )}
                      </tbody>
                   </table>
                </div>
             </div>

             {/* Inventory Breakdown */}
             <div className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col h-[280px] border-t-4 border-t-emerald-500 overflow-hidden">
                <div className="p-4 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50 flex-shrink-0">
                   <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Rooms Distribution</h3>
                      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm shadow-emerald-100">{stats.total}</div>
                   </div>
                   <Link to="/rooms" className="text-[9px] font-black text-white hover:bg-emerald-700 uppercase tracking-widest px-2.5 py-1.5 bg-emerald-600 rounded-lg shadow-md shadow-emerald-100 transition-all flex items-center gap-1.5">
                      Rooms <BedDouble size={10} />
                   </Link>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 p-5">
                   {/* Deluxe AC Item - Vertical Style */}
                   <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center text-center group/item">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-2 group-hover/item:scale-110 transition-transform">
                         <Sparkles size={20} />
                      </div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">AC</p>
                      
                      <div className="w-full space-y-2">
                          <div className="flex justify-between items-center px-3 py-2 bg-white/80 rounded-lg shadow-sm">
                              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wide">Available</span>
                              <span className="text-sm font-black text-emerald-600">{roomBreakdown.AC.available}</span>
                          </div>
                          <div className="flex justify-between items-center px-3 py-2 bg-emerald-100/50 rounded-lg">
                              <span className="text-[9px] font-bold text-emerald-700/70 uppercase tracking-wide">Booked</span>
                              <span className="text-sm font-black text-emerald-700/70">{roomBreakdown.AC.occupied}</span>
                          </div>
                      </div>
                   </div>

                   {/* Standard Non-AC Item - Vertical Style */}
                   <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-center items-center text-center group/item">
                      <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200 mb-2 group-hover/item:scale-110 transition-transform">
                         <BedDouble size={20} />
                      </div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Non-AC</p>
                      
                       <div className="w-full space-y-2">
                          <div className="flex justify-between items-center px-3 py-2 bg-white/80 rounded-lg shadow-sm">
                              <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wide">Available</span>
                              <span className="text-sm font-black text-gray-800">{roomBreakdown['Non-AC'].available}</span>
                          </div>
                          <div className="flex justify-between items-center px-3 py-2 bg-gray-200/50 rounded-lg">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Booked</span>
                              <span className="text-sm font-black text-gray-500">{roomBreakdown['Non-AC'].occupied}</span>
                          </div>
                      </div>
                   </div>
                </div>
             </div>

         {/* Staff on Duty */}
         <div className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col h-[280px] border-t-4 border-t-amber-500 overflow-hidden">
            <div className="p-4 border-b border-amber-100 flex justify-between items-center bg-amber-50/50 flex-shrink-0">
               <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Staff Overview</h3>
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black shadow-sm shadow-amber-100">{stats.totalStaff}</div>
               </div>
               <Link to="/employees" className="text-[9px] font-black text-white hover:bg-amber-600 uppercase tracking-widest px-2.5 py-1.5 bg-amber-500 rounded-lg shadow-md shadow-amber-100 transition-all flex items-center gap-1.5">
                  Manage <Users size={10} />
               </Link>
            </div>
            
             <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {employees.filter(e => e.status !== 'Inactive').length === 0 ? (
                   <div className="px-4 py-20 text-center text-gray-400 font-bold italic">No active staff members</div>
                ) : (
                   employees
                     .filter(e => e.status !== 'Inactive')
                     .sort((a, b) => {
                       // Sort by createdAt timestamp (most recent first)
                       if (a.createdAt || b.createdAt) {
                         return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                       }
                       // Fallback to alphabetical
                       return a.name.localeCompare(b.name);
                     })
                     .slice(0, 15)
                     .map(emp => {
                       const assignedRooms = employeeRoomMap[emp.id] || [];
                       return (
                       <div key={emp.id} className="group flex items-start justify-between p-3 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent rounded-2xl transition-all cursor-default border border-transparent hover:border-amber-100/50">
                       <div className="flex-shrink-0 w-24 mr-2 pt-1">
                         <h4 className="font-bold text-gray-800 group-hover:text-amber-700 transition-colors uppercase text-[10px] tracking-tight truncate" title={emp.name}>{emp.name}</h4>
                         <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{emp.role}</p>
                       </div>
                       <div className="flex-1 grid grid-cols-5 gap-1 justify-items-end">
                          {assignedRooms.length > 0 ? (
                             assignedRooms.map(room => (
                               <span key={room} className="w-full text-center px-0.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[8px] font-black border border-amber-100/50 shadow-sm whitespace-nowrap overflow-hidden">
                                 {room}
                               </span>
                             ))
                          ) : (
                             <div className="col-span-5 flex justify-end">
                                <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest italic">Free</span>
                             </div>
                          )}
                       </div>
                     </div>
                     );
                   })

                )}
             </div>
         </div>
      </div>
       </>
     )}

      {activeTab === 'calendar' && (
         <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wider">15-Day Booking Matrix</h2>
                <p className="text-gray-500 text-xs font-medium">Visual timeline of room occupancy and bookings starting from selected date</p>
              </div>
              
              {/* Date Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full sm:w-48">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Calendar Start Date</span>
                  <input
                    type="date"
                    value={calendarStartDate}
                    onChange={(e) => setCalendarStartDate(e.target.value)}
                    className="bg-white border border-gray-200 text-black font-bold text-xs py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500 transition-all w-full shadow-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    const d = new Date();
                    setCalendarStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }}
                  className="px-4 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 bg-white border border-gray-200 rounded-lg shadow-sm transition-all whitespace-nowrap h-[32px] flex items-center justify-center w-full sm:w-auto"
                >
                  Today
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-black text-gray-700 uppercase tracking-wider w-28 bg-white sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Room</th>
                    {calendarDates.map((date, idx) => {
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = date.getDate();
                      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                      const isToday = idx === 0;
                      return (
                        <th key={idx} className={`px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider border-r border-gray-100 min-w-[70px] ${isToday ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 bg-gray-50/55'}`}>
                          <div>{dayName}</div>
                          <div className="text-xs font-black mt-0.5">{dayNum} {monthName}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...rooms]
                    .sort((a, b) => {
                      const roomA = a.roomNumber !== undefined && a.roomNumber !== null ? String(a.roomNumber) : '';
                      const roomB = b.roomNumber !== undefined && b.roomNumber !== null ? String(b.roomNumber) : '';
                      
                      const getFloorOrder = (roomStr) => {
                        if (!roomStr) return 99;
                        const firstChar = roomStr.charAt(0).toUpperCase();
                        switch (firstChar) {
                          case 'G': return 0;
                          case 'F': return 1;
                          case 'S': return 2;
                          case 'T': return 3;
                          default: break;
                        }
                        const digitsOnly = roomStr.replace(/\D/g, '');
                        if (digitsOnly.length >= 3) {
                          const floorDigit = parseInt(digitsOnly.slice(0, digitsOnly.length - 2));
                          if (!isNaN(floorDigit)) return floorDigit;
                        }
                        return 99;
                      };

                      const floorA = getFloorOrder(roomA);
                      const floorB = getFloorOrder(roomB);
                      
                      if (floorA !== floorB) {
                        return floorA - floorB;
                      }
                      
                      const numA = parseInt(roomA.replace(/\D/g, '')) || 0;
                      const numB = parseInt(roomB.replace(/\D/g, '')) || 0;
                      
                      if (numA !== numB) {
                        return numA - numB;
                      }
                      return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
                    })
                    .map(room => (
                    <tr key={room.id} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-4 py-3 font-black text-xs text-gray-800 bg-white sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] text-center">
                        <span>{(() => {
                          const num = room.roomNumber;
                          if (!num) return '';
                          const match = String(num).match(/^([A-Za-z]+)(\d+)$/);
                          if (match) {
                            return `${match[1].toLowerCase()} - ${match[2]}`;
                          }
                          return num;
                        })()}</span>
                      </td>
                      {calendarDates.map((date, idx) => {
                        const booking = getBookingForRoomAndDay(room.id, date);
                        
                        let cellContent = null;
                        
                        if (booking) {
                          const guestName = getCustomerName(booking.customerId);
                          const guestPhone = getCustomerPhone(booking.customerId);
                          
                          cellContent = (
                            <div 
                              className="h-full w-full rounded p-1 text-[9px] font-bold overflow-hidden text-center truncate border border-red-600 bg-red-600 text-white shadow-sm cursor-default" 
                              title={`Guest: ${guestName} | Contact: ${guestPhone}`}
                            >
                              {guestName}
                            </div>
                          );
                        }
                        
                        return (
                          <td key={idx} className={`p-1 border-r border-gray-100 text-center min-w-[70px] ${idx === 0 ? 'bg-indigo-50/10' : ''}`}>
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      )}
      {activeTab === 'collections' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Export Custom Range CSV Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Export Collections Report (CSV)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end w-full">
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[9px] font-black text-black uppercase tracking-widest">Start Date</span>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-black font-bold text-xs py-2 px-3 rounded-lg outline-none focus:bg-white focus:border-indigo-500 transition-all w-full shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1 w-full">
                <span className="text-[9px] font-black text-black uppercase tracking-widest">End Date</span>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-black font-bold text-xs py-2 px-3 rounded-lg outline-none focus:bg-white focus:border-indigo-500 transition-all w-full shadow-sm"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-6 rounded-lg shadow-sm transition-all w-full mt-2 sm:mt-0"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-xl shadow-lg border border-rose-400 text-white flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div>
                <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest">Today's Collection</p>
                <p className="text-3xl font-black mt-1 text-white">₹{revenueReport.todayCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <Sparkles size={24} className="text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg border border-blue-400 text-white flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">This Month ({new Date().toLocaleDateString('en-US', { month: 'long' })})</p>
                <p className="text-3xl font-black mt-1 text-white">₹{revenueReport.currentMonthCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <Calendar size={24} className="text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-lg border border-emerald-400 text-white flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div>
                <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">Year Collection ({selectedReportYear})</p>
                <p className="text-3xl font-black mt-1 text-white">₹{(revenueReport.yearly[selectedReportYear] || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-xl shadow-lg border border-indigo-400 text-white flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest">Lifetime Collected</p>
                <p className="text-3xl font-black mt-1 text-white">₹{revenueReport.lifetimeCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <IndianRupee size={24} className="text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-xl shadow-lg border border-amber-400 text-white flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div>
                <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest">Total Pending Due</p>
                <p className="text-3xl font-black mt-1 text-white">₹{revenueReport.pendingCollected.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <CreditCard size={24} className="text-white" />
              </div>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end w-full">
            {/* Year filter */}
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[9px] font-black text-black uppercase tracking-widest">Filter Year</span>
              <select
                value={selectedReportYear}
                onChange={(e) => {
                  setSelectedReportYear(e.target.value);
                  setFilterDate(''); // Clear date filter when switching years
                }}
                className="bg-gray-50 border border-gray-200 text-black font-bold text-xs py-2 px-3 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-indigo-500 transition-all shadow-sm w-full"
              >
                {Array.from(new Set([new Date().getFullYear().toString(), ...Object.keys(revenueReport.yearly)]))
                  .sort((a, b) => b.localeCompare(a))
                  .map(year => <option key={year} value={year}>{year}</option>)
                }
              </select>
            </div>

            {/* Month filter */}
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[9px] font-black text-black uppercase tracking-widest">Filter Month</span>
              <select
                value={selectedReportMonth}
                onChange={(e) => {
                  setSelectedReportMonth(e.target.value);
                  setFilterDate(''); // Clear date filter when switching months
                }}
                className="bg-gray-50 border border-gray-200 text-black font-bold text-xs py-2 px-3 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-indigo-500 transition-all shadow-sm w-full"
              >
                <option value="All">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Date Search */}
            <div className="flex flex-col gap-1 w-full">
              <span className="text-[9px] font-black text-black uppercase tracking-widest">Search Specific Date</span>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-black font-bold text-xs py-2 px-3 rounded-lg outline-none focus:bg-white focus:border-indigo-500 transition-all w-full shadow-sm"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="px-2.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>



          {/* Conditional Views based on Specific Date Search */}
          {filterDate ? (
            /* Specific Date Revenue Summary View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Revenue Details for {new Date(filterDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <span className="text-xl font-black text-black">₹{(dateRevenue?.total || 0).toLocaleString('en-IN')}</span>
              </div>

              {/* Payment Mode breakdown for this date */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                <span className="text-[9px] font-black text-black uppercase tracking-widest block">Collection Breakdown</span>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(dateRevenue?.breakdown || {}).length === 0 ? (
                    <span className="text-xs text-gray-400 font-medium italic">No payments collected.</span>
                  ) : (
                    Object.entries(dateRevenue.breakdown).map(([mode, amt]) => (
                      <span key={mode} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-black text-black shadow-sm uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {mode}: ₹{amt.toLocaleString('en-IN')}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Bookings table/list */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-black uppercase tracking-widest block">Associated Transactions</span>
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-black uppercase tracking-wider">
                        <th className="px-4 py-3">Guest Name</th>
                        <th className="px-4 py-3 text-center">Room(s)</th>
                        <th className="px-4 py-3 text-center">Payment Mode</th>
                        <th className="px-4 py-3 text-center">Booking Status</th>
                        <th className="px-4 py-3 text-right">Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-black">
                      {dateRevenue?.bookings.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-400 font-medium italic">
                            No allocations checked-in or paid on this date.
                          </td>
                        </tr>
                      ) : (
                        dateRevenue?.bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-black text-black">{booking.guestName}</td>
                            <td className="px-4 py-3 text-center">{booking.rooms}</td>
                            <td className="px-4 py-3 text-center uppercase"><span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-black rounded-md font-bold text-[9px]">{booking.paymentType}</span></td>
                            <td className="px-4 py-3 text-center uppercase">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] bg-emerald-50 border border-emerald-100 text-black`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-black">₹{booking.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Month/Year Breakdown View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Year-by-Year Comparison */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Yearly Comparison
                  </h3>
                  <div className="divide-y divide-gray-100 overflow-y-auto max-h-[300px] pr-1">
                    {Object.keys(revenueReport.yearly).length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm font-medium">No yearly collections yet.</div>
                    ) : (
                      Object.entries(revenueReport.yearly)
                        .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                        .map(([year, amount]) => (
                          <div key={year} className="py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors px-2 rounded-lg">
                            <span className="text-sm font-black text-black">{year}</span>
                            <span className="text-sm font-black text-black">₹{amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly breakdown of selected year */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {selectedReportMonth === 'All' 
                      ? `Month-wise Collections for ${selectedReportYear}` 
                      : `Day-wise Collections for ${new Date(`${selectedReportYear}-${selectedReportMonth}-02`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    }
                  </h3>
                </div>

                {/* Month/Day breakdown list */}
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
                  {(() => {
                    if (selectedReportMonth === 'All') {
                      // Standard Month-wise view
                      const monthsInYear = Object.entries(revenueReport.monthly)
                        .filter(([key]) => key.startsWith(selectedReportYear))
                        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

                      if (monthsInYear.length === 0) {
                        return (
                          <div className="py-12 text-center text-gray-400 text-sm font-medium">
                            No transactions recorded for the year {selectedReportYear}.
                          </div>
                        );
                      }

                      const maxMonthVal = Math.max(...monthsInYear.map(([, data]) => data.total), 1);

                      return monthsInYear.map(([monthKey, data]) => {
                        const monthDate = new Date(`${monthKey}-02`);
                        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
                        const percent = Math.round((data.total / maxMonthVal) * 100);

                        return (
                          <div key={monthKey} className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50/70 transition-all space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-black text-black">{monthName}</span>
                                <span className="text-black text-[10px] ml-2 font-bold">{monthKey}</span>
                              </div>
                              <span className="text-sm font-black text-black">₹{data.total.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(data.breakdown).map(([mode, amt]) => (
                                <span key={mode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200/60 text-[9px] font-black text-black shadow-sm uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                  {mode}: ₹{amt.toLocaleString('en-IN')}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    } else {
                      // Day-wise view for selected Month & Year
                      const prefix = `${selectedReportYear}-${selectedReportMonth}`;
                      const daysInMonth = Object.entries(revenueReport.daily)
                        .filter(([key]) => key.startsWith(prefix))
                        .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)); // Newest first

                      if (daysInMonth.length === 0) {
                        return (
                          <div className="py-12 text-center text-gray-400 text-sm font-medium">
                            No transactions recorded for {new Date(`${selectedReportYear}-${selectedReportMonth}-02`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                          </div>
                        );
                      }

                      const maxDayVal = Math.max(...daysInMonth.map(([, data]) => data.total), 1);

                      return daysInMonth.map(([dayKey, data]) => {
                        const dayDate = new Date(dayKey);
                        const formattedDayName = dayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
                        const percent = Math.round((data.total / maxDayVal) * 100);

                        return (
                          <div key={dayKey} className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50/70 transition-all space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-black text-black">{formattedDayName}</span>
                                <span className="text-black text-[10px] ml-2 font-bold">{dayKey}</span>
                              </div>
                              <span className="text-sm font-black text-black">₹{data.total.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(data.breakdown).map(([mode, amt]) => (
                                <span key={mode} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200/60 text-[9px] font-black text-black shadow-sm uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                  {mode}: ₹{amt.toLocaleString('en-IN')}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default Dashboard;
