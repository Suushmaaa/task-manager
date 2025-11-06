import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, X, Edit2, Trash2, Eye, Download, Upload, Undo, AlertCircle } from 'lucide-react';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [lastDeletedTask, setLastDeletedTask] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  
  // BUG FIX #1: Use ref to prevent double fetch
  const hasLoadedRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    revenue: '',
    timeTaken: '',
    notes: '',
    priority: 'medium',
    status: 'pending'
  });

  // BUG FIX #1: Load tasks only once on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadTasks();
    }
  }, []);

  const loadTasks = () => {
    console.log('Loading tasks - should only appear once');
    const stored = localStorage.getItem('tasks');
    if (stored) {
      setTasks(JSON.parse(stored));
    }
  };

  useEffect(() => {
    if (tasks.length > 0 || hasLoadedRef.current) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // BUG FIX #5: Safe ROI calculation with proper validation
  const calculateROI = (revenue, timeTaken) => {
    const rev = parseFloat(revenue);
    const time = parseFloat(timeTaken);
    
    if (isNaN(rev) || isNaN(time) || rev < 0 || time < 0) {
      return 0;
    }
    
    if (time === 0) {
      return 0;
    }
    
    return parseFloat((rev / time).toFixed(2));
  };

  // BUG FIX #3: Stable sorting with deterministic tie-breaker
  const getSortedTasks = () => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    return filtered.sort((a, b) => {
      // Primary: ROI (descending)
      if (b.roi !== a.roi) {
        return b.roi - a.roi;
      }
      
      // Secondary: Priority (High > Medium > Low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Tertiary (BUG FIX #3): Stable tie-breaker using title alphabetically
      return a.title.localeCompare(b.title);
    });
  };

  const handleAddTask = () => {
    if (!formData.title || !formData.revenue || !formData.timeTaken) {
      alert('Please fill in all required fields');
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      ...formData,
      revenue: parseFloat(formData.revenue),
      timeTaken: parseFloat(formData.timeTaken),
      roi: calculateROI(formData.revenue, formData.timeTaken),
      createdAt: new Date().toISOString()
    };

    setTasks([...tasks, newTask]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditTask = () => {
    if (!formData.title || !formData.revenue || !formData.timeTaken) {
      alert('Please fill in all required fields');
      return;
    }

    setTasks(tasks.map(task => 
      task.id === selectedTask.id 
        ? {
            ...task,
            ...formData,
            revenue: parseFloat(formData.revenue),
            timeTaken: parseFloat(formData.timeTaken),
            roi: calculateROI(formData.revenue, formData.timeTaken)
          }
        : task
    ));
    setIsEditDialogOpen(false);
    setSelectedTask(null);
    resetForm();
  };

  const handleDeleteTask = (task) => {
    setTasks(tasks.filter(t => t.id !== task.id));
    setLastDeletedTask(task);
    setShowSnackbar(true);
    setIsDeleteDialogOpen(false);
    setSelectedTask(null);
    
    // BUG FIX #2: Auto-clear snackbar after 5 seconds
    setTimeout(() => {
      setShowSnackbar(false);
      setLastDeletedTask(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (lastDeletedTask) {
      setTasks([...tasks, lastDeletedTask]);
      setLastDeletedTask(null);
      setShowSnackbar(false);
    }
  };

  // BUG FIX #2: Properly clear deleted task state when snackbar closes
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
    setLastDeletedTask(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      revenue: '',
      timeTaken: '',
      notes: '',
      priority: 'medium',
      status: 'pending'
    });
  };

  // BUG FIX #4: Stop event propagation to prevent double dialogs
  const handleViewClick = (task) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (e, task) => {
    e.stopPropagation(); // BUG FIX #4: Prevent view dialog from opening
    setSelectedTask(task);
    setFormData({
      title: task.title,
      revenue: task.revenue.toString(),
      timeTaken: task.timeTaken.toString(),
      notes: task.notes || '',
      priority: task.priority,
      status: task.status
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (e, task) => {
    e.stopPropagation(); // BUG FIX #4: Prevent view dialog from opening
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleExport = () => {
    const csv = [
      ['Title', 'Revenue', 'Time Taken', 'ROI', 'Priority', 'Status', 'Notes'],
      ...tasks.map(t => [t.title, t.revenue, t.timeTaken, t.roi, t.priority, t.status, t.notes || ''])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').slice(1);
      const importedTasks = rows.filter(row => row.trim()).map((row, index) => {
        const [title, revenue, timeTaken, , priority, status, notes] = row.split(',');
        const rev = parseFloat(revenue);
        const time = parseFloat(timeTaken);
        return {
          id: Date.now().toString() + index,
          title: title?.trim() || 'Untitled',
          revenue: isNaN(rev) ? 0 : rev,
          timeTaken: isNaN(time) ? 1 : time,
          roi: calculateROI(revenue, timeTaken),
          priority: priority?.trim() || 'medium',
          status: status?.trim() || 'pending',
          notes: notes?.trim() || '',
          createdAt: new Date().toISOString()
        };
      });
      setTasks([...tasks, ...importedTasks]);
    };
    reader.readAsText(file);
  };

  const calculateSummary = () => {
    const totalRevenue = tasks.reduce((sum, task) => sum + task.revenue, 0);
    const totalTime = tasks.reduce((sum, task) => sum + task.timeTaken, 0);
    const avgROI = tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.roi, 0) / tasks.length : 0;
    const efficiency = totalTime > 0 ? (totalRevenue / totalTime).toFixed(2) : 0;
    
    let grade = 'F';
    if (avgROI >= 100) grade = 'A';
    else if (avgROI >= 75) grade = 'B';
    else if (avgROI >= 50) grade = 'C';
    else if (avgROI >= 25) grade = 'D';

    return { totalRevenue, efficiency, avgROI: avgROI.toFixed(2), grade };
  };

  const summary = calculateSummary();
  const sortedTasks = getSortedTasks();

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const Dialog = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Manager</h1>
          <p className="text-gray-600">Track and prioritize tasks by ROI</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">${summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Efficiency</p>
            <p className="text-2xl font-bold text-blue-600">{summary.efficiency}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Avg ROI</p>
            <p className="text-2xl font-bold text-purple-600">{summary.avgROI}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Performance</p>
            <p className="text-2xl font-bold text-orange-600">Grade {summary.grade}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Task
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={20} />
              Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
              <Upload size={20} />
              Import
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {sortedTasks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No tasks found. Add your first task to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => handleViewClick(task)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{task.title}</td>
                      <td className="px-6 py-4 text-gray-700">${task.revenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-700">{task.timeTaken}h</td>
                      <td className="px-6 py-4 font-semibold text-blue-600">{task.roi.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => handleEditClick(e, task)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, task)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog
          isOpen={isAddDialogOpen || isEditDialogOpen}
          onClose={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }}
          title={isAddDialogOpen ? 'Add New Task' : 'Edit Task'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.revenue}
                onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Taken (hours) *</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.timeTaken}
                onChange={(e) => setFormData({...formData, timeTaken: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={isAddDialogOpen ? handleAddTask : handleEditTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isAddDialogOpen ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </Dialog>

        {/* View Dialog */}
        <Dialog
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setSelectedTask(null);
          }}
          title="Task Details"
        >
          {selectedTask && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Title</p>
                <p className="font-medium">{selectedTask.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="font-medium">${selectedTask.revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time Taken</p>
                  <p className="font-medium">{selectedTask.timeTaken}h</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">ROI</p>
                <p className="text-xl font-bold text-blue-600">{selectedTask.roi.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
              </div>
              {selectedTask.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="text-gray-800">{selectedTask.notes}</p>
                </div>
              )}
            </div>
          )}
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedTask(null);
          }}
          title="Confirm Delete"
        >
          <p className="mb-4">Are you sure you want to delete this task?</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedTask(null);
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteTask(selectedTask)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Dialog>

        {/* Snackbar */}
        {showSnackbar && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 z-50">
            <span>Task deleted</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-blue-300 hover:text-blue-200"
            >
              <Undo size={16} />
              Undo
            </button>
            <button
              onClick={handleCloseSnackbar}
              className="text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManager;