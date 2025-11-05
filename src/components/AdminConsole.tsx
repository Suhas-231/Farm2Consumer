import React, { useState, useEffect } from 'react';
import { Users, Package, AlertTriangle, Shield, BarChart3, IndianRupee } from 'lucide-react';
import { getAllUsers, getAllProducts, getAllOrders, getBlockedUsers, blockUser, unblockUser, updateOrderStatus } from '../utils/database';
import notify from '../utils/notify';

const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmerPayouts, setFarmerPayouts] = useState<{ [farmerId: string]: { farmerId: string; farmerName: string; farmerPhone?: string; totalAmount: number; items: number } }>({});
  const [paidMap, setPaidMap] = useState<{ [farmerId: string]: boolean }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, productsData, ordersData, blockedUsersData] = await Promise.allSettled([
        getAllUsers(),
        getAllProducts(),
        getAllOrders(),
        getBlockedUsers()
      ]);
      
      setUsers(usersData.status === 'fulfilled' ? usersData.value : []);
      setProducts(productsData.status === 'fulfilled' ? productsData.value : []);
      const fetchedOrders = ordersData.status === 'fulfilled' ? ordersData.value : [];
      setOrders(fetchedOrders);
      setBlockedUsers(blockedUsersData.status === 'fulfilled' ? blockedUsersData.value : []);

      // Compute payouts by farmer from delivered orders
      const productIdToFarmer: { [productId: string]: { farmerId: string; farmerName: string; farmerPhone?: string } } = {};
      (productsData.status === 'fulfilled' ? productsData.value : []).forEach((p: any) => {
        productIdToFarmer[p.id] = { farmerId: p.farmerId, farmerName: p.farmerName, farmerPhone: p.farmerPhone };
      });

      const payouts: { [farmerId: string]: { farmerId: string; farmerName: string; farmerPhone?: string; totalAmount: number; items: number } } = {};
      (fetchedOrders || []).forEach((order: any) => {
        if (order.status !== 'delivered') return;
        (order.items || []).forEach((item: any) => {
          const map = productIdToFarmer[item.productId];
          if (!map) return;
          const farmerKey = map.farmerId;
          // item.pricePerKg is consumer price (includes 2% commission). Remove commission for farmer payout.
          const farmerUnitPrice = Number(item.pricePerKg) / 1.02;
          const lineAmount = farmerUnitPrice * Number(item.quantity);
          if (!payouts[farmerKey]) {
            payouts[farmerKey] = { farmerId: map.farmerId, farmerName: map.farmerName, farmerPhone: map.farmerPhone, totalAmount: 0, items: 0 };
          }
          payouts[farmerKey].totalAmount += lineAmount;
          payouts[farmerKey].items += Number(item.quantity);
        });
      });
      // Round amounts to 2 decimals
      Object.values(payouts).forEach(p => { p.totalAmount = Math.round(p.totalAmount * 100) / 100; });
      setFarmerPayouts(payouts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFarmer = (farmerId: string) => {
    const payout = farmerPayouts[farmerId];
    if (!payout || payout.totalAmount <= 0) {
      notify('No payout due for this farmer.', { variant: 'warning' });
      return;
    }
    const defaultVpa = payout.farmerPhone ? `91${String(payout.farmerPhone).replace(/\D/g, '')}@upi` : '';
    const vpa = window.prompt(`Enter UPI ID for ${payout.farmerName}`, defaultVpa || 'farmer@upi');
    if (!vpa) return;
    const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payout.farmerName || 'Farmer')}&am=${encodeURIComponent(payout.totalAmount.toFixed(2))}&cu=INR&tn=${encodeURIComponent('Farm2Consumer payout')}`;
    window.location.href = upiLink;
    // Optimistically mark as paid in UI
    setPaidMap(prev => ({ ...prev, [farmerId]: true }));
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const success = await blockUser(userId);
      if (success) {
        // Update the user's blocked status immediately in the state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, isBlocked: true } : user
          )
        );
        setBlockedUsers(prevBlocked => {
          const user = users.find(u => u.id === userId);
          return user ? [...prevBlocked, { ...user, isBlocked: true }] : prevBlocked;
        });
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const success = await unblockUser(userId);
      if (success) {
        // Update the user's blocked status immediately in the state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, isBlocked: false } : user
          )
        );
        setBlockedUsers(prevBlocked => 
          prevBlocked.filter(user => user.id !== userId)
        );
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };


  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const success = await updateOrderStatus(orderId, newStatus);
      if (success) {
        // Update the order status immediately in the state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        notify(`Order ${orderId} status updated to ${newStatus}`, { variant: 'success' });
      } else {
        notify('Failed to update order status', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      notify('Error updating order status', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin data...</p>
        </div>
            </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-600" />
              <span className="text-gray-700">Administrator</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'users', name: 'Users', icon: Users },
            { id: 'products', name: 'Products', icon: Package },
            { id: 'orders', name: 'Orders', icon: AlertTriangle },
            { id: 'payouts', name: 'Payouts', icon: IndianRupee },
            { id: 'blocked', name: 'Blocked Users', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
                </div>
              </div>
          </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{blockedUsers.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Users</h3>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={user.profileImage || 'https://via.placeholder.com/40'}
                            alt="Profile"
                            className="h-10 w-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || user.fullName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'farmer' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.isBlocked ? (
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlockUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Products</h3>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={product.image || 'https://via.placeholder.com/40'}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
              </div>
            </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.farmerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{product.price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
      </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Orders</h3>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {order.consumerName ? order.consumerName.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{order.consumerName || 'Unknown Consumer'}</div>
                            <div className="text-sm text-gray-500">ID: {order.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.productCount} items</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{order.total}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="placed">Placed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Farmer Payouts</h3>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due (₹)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(farmerPayouts).length === 0 && (
                      <tr>
                        <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={5}>No payouts due. Ensure orders are delivered.</td>
                      </tr>
                    )}
                    {Object.values(farmerPayouts).map((payout) => (
                      <tr key={payout.farmerId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.farmerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payout.farmerId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payout.items}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">₹{payout.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handlePayFarmer(payout.farmerId)}
                            className={`px-4 py-2 rounded-md transition-colors ${paidMap[payout.farmerId] ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                            disabled={payout.totalAmount <= 0 || !!paidMap[payout.farmerId]}
                          >
                            {paidMap[payout.farmerId] ? 'Paid' : 'Pay via UPI'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Users Tab */}
        {activeTab === 'blocked' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Blocked Users</h3>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blockedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={user.profileImage || 'https://via.placeholder.com/40'}
                            alt="Profile"
                            className="h-10 w-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || user.fullName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
        </div>
      </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'farmer' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button
                          onClick={() => handleUnblockUser(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Unblock
            </button>
                      </td>
                    </tr>
          ))}
                </tbody>
              </table>
            </div>
        </div>
        )}

      </div>
    </div>
  );
};

export default AdminConsole;