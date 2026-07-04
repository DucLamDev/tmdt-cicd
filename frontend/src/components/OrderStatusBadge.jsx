import React from 'react';

const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    PLACED: { label: 'Đã đặt hàng', color: 'bg-blue-100 text-blue-700' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'bg-purple-100 text-purple-700' },
    PACKED: { label: 'Đã đóng gói', color: 'bg-indigo-100 text-indigo-700' },
    ASSIGNED: { label: 'Chờ lấy hàng', color: 'bg-cyan-100 text-cyan-700' },
    PICKED_UP: { label: 'Đã lấy hàng', color: 'bg-yellow-100 text-yellow-700' },
    IN_TRANSIT: { label: 'Đang giao', color: 'bg-orange-100 text-orange-700' },
    DELIVERED: { label: 'Đã giao', color: 'bg-green-100 text-green-700' },
    RETURN_REQUESTED: { label: 'Đã yêu cầu trả hàng', color: 'bg-yellow-100 text-yellow-800' },
    RETURN_APPROVED: { label: 'Đã duyệt trả hàng', color: 'bg-blue-100 text-blue-700' },
    RETURN_REJECTED: { label: 'Từ chối trả hàng', color: 'bg-red-100 text-red-700' },
    RETURN_PICKED: { label: 'Đã lấy hàng trả', color: 'bg-indigo-100 text-indigo-700' },
    RETURN_COMPLETED: { label: 'Đã hoàn tiền', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
    FAILED: { label: 'Thất bại', color: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
