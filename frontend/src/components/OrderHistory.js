import React, { useState, useEffect } from 'react';
import { orderServiceAPI } from '../services/api';

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        setError('Vui lòng đăng nhập để xem lịch sử đơn hàng');
        setLoading(false);
        return;
      }

      const response = await orderServiceAPI.getOrders(userId);
      setOrders(response.data.orders || []);
      setError(null);
    } catch (err) {
      setError('Không thể tải lịch sử đơn hàng: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'confirmed': '#28a745',
      'shipped': '#17a2b8',
      'delivered': '#6c757d',
      'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'Đang xử lý',
      'confirmed': 'Đã xác nhận',
      'shipped': 'Đang giao',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy'
    };
    return texts[status] || status;
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
      return;
    }

    try {
      await orderServiceAPI.cancelOrder(orderId);
      alert('Đơn hàng đã được hủy thành công!');
      fetchOrders(); // Refresh list
    } catch (err) {
      alert('Không thể hủy đơn hàng: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Đang tải lịch sử đơn hàng...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>📦 Lịch sử đơn hàng</h1>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <h3 style={{ color: '#6c757d' }}>Chưa có đơn hàng nào</h3>
          <p style={{ color: '#6c757d' }}>Hãy mua sắm và tạo đơn hàng đầu tiên của bạn!</p>
        </div>
      ) : (
        <div>
          {orders.map(order => (
            <div key={order.id} style={{
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    Đơn hàng #{order.id}
                  </h3>
                  <p style={{ margin: '5px 0', color: '#666' }}>
                    <strong>Ngày đặt:</strong> {new Date(order.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <span style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: getStatusColor(order.status),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              <div style={{
                borderTop: '1px solid #dee2e6',
                paddingTop: '15px',
                marginTop: '15px'
              }}>
                <p style={{ margin: '8px 0', color: '#333' }}>
                  <strong>Sản phẩm:</strong> {order.product_name}
                </p>
                <p style={{ margin: '8px 0', color: '#666' }}>
                  <strong>Size:</strong> {order.size} | <strong>Số lượng:</strong> {order.quantity}
                </p>
                <p style={{ margin: '8px 0', color: '#666' }}>
                  <strong>Đơn giá:</strong> {order.product_price?.toLocaleString('vi-VN')} VND
                </p>
                <p style={{ margin: '8px 0', color: '#28a745', fontSize: '18px' }}>
                  <strong>Tổng tiền:</strong> {order.total_price?.toLocaleString('vi-VN')} VND
                </p>
              </div>

              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <div style={{ marginTop: '15px', textAlign: 'right' }}>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Hủy đơn hàng
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderHistory;
