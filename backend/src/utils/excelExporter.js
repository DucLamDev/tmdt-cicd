import ExcelJS from 'exceljs';

/**
 * Tạo workbook Excel với styling
 */
export const createWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Marketplace System';
  workbook.created = new Date();
  return workbook;
};

/**
 * Style cho header
 */
export const getHeaderStyle = () => ({
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
});

/**
 * Xuất báo cáo bán hàng cho Seller
 */
export const exportSellerSalesReport = async (salesData, bestSellers, shopName) => {
  const workbook = createWorkbook();
  
  // Sheet 1: Tổng quan doanh thu
  const summarySheet = workbook.addWorksheet('Tổng quan');
  summarySheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 30 },
    { header: 'Giá trị', key: 'value', width: 30 },
  ];
  
  // Apply header style
  summarySheet.getRow(1).eachCell((cell) => {
    cell.style = getHeaderStyle();
  });

  // Add summary data
  if (salesData?.summary) {
    summarySheet.addRow({ metric: 'Tổng đơn hàng', value: salesData.summary.totalOrders || 0 });
    summarySheet.addRow({ metric: 'Tổng doanh thu (VNĐ)', value: salesData.summary.totalRevenue || 0 });
    summarySheet.addRow({ metric: 'Giá trị trung bình/đơn (VNĐ)', value: Math.round(salesData.summary.avgOrderValue || 0) });
  }

  // Sheet 2: Doanh thu theo thời gian
  if (salesData?.salesData && salesData.salesData.length > 0) {
    const salesSheet = workbook.addWorksheet('Doanh thu theo thời gian');
    salesSheet.columns = [
      { header: 'Thời gian', key: 'time', width: 20 },
      { header: 'Số đơn', key: 'orders', width: 15 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 },
      { header: 'Trung bình/đơn (VNĐ)', key: 'avgOrder', width: 25 },
    ];

    salesSheet.getRow(1).eachCell((cell) => {
      cell.style = getHeaderStyle();
    });

    salesData.salesData.forEach((item) => {
      salesSheet.addRow({
        time: item._id,
        orders: item.totalOrders,
        revenue: item.totalRevenue,
        avgOrder: Math.round(item.avgOrderValue),
      });
    });
  }

  // Sheet 3: Sản phẩm bán chạy
  if (bestSellers && bestSellers.length > 0) {
    const bestSheet = workbook.addWorksheet('Sản phẩm bán chạy');
    bestSheet.columns = [
      { header: 'Tên sản phẩm', key: 'name', width: 40 },
      { header: 'Đã bán', key: 'quantity', width: 15 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 },
      { header: 'Giá trung bình (VNĐ)', key: 'avgPrice', width: 25 },
    ];

    bestSheet.getRow(1).eachCell((cell) => {
      cell.style = getHeaderStyle();
    });

    bestSellers.forEach((product) => {
      bestSheet.addRow({
        name: product.title,
        quantity: product.totalQuantity,
        revenue: product.totalRevenue,
        avgPrice: Math.round(product.avgPrice),
      });
    });
  }

  return workbook;
};

/**
 * Xuất báo cáo hệ thống cho Admin
 */
export const exportAdminSystemReport = async (stats, revenueData, topShops) => {
  const workbook = createWorkbook();
  
  // Sheet 1: Tổng quan hệ thống
  const summarySheet = workbook.addWorksheet('Tổng quan hệ thống');
  summarySheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 35 },
    { header: 'Giá trị', key: 'value', width: 30 },
  ];
  
  summarySheet.getRow(1).eachCell((cell) => {
    cell.style = getHeaderStyle();
  });

  if (stats) {
    summarySheet.addRow({ metric: 'Tổng người dùng', value: stats.totalUsers || 0 });
    summarySheet.addRow({ metric: 'Tổng người bán', value: stats.totalSellers || 0 });
    summarySheet.addRow({ metric: 'Tổng shipper', value: stats.totalShippers || 0 });
    summarySheet.addRow({ metric: 'Tổng sản phẩm', value: stats.totalProducts || 0 });
    summarySheet.addRow({ metric: 'Tổng đơn hàng', value: stats.totalOrders || 0 });
    summarySheet.addRow({ metric: 'Tổng doanh thu (VNĐ)', value: stats.totalRevenue || 0 });
  }

  // Sheet 2: Doanh thu theo thời gian
  if (revenueData && revenueData.length > 0) {
    const revenueSheet = workbook.addWorksheet('Doanh thu theo thời gian');
    revenueSheet.columns = [
      { header: 'Thời gian', key: 'time', width: 20 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 25 },
      { header: 'Số đơn', key: 'orders', width: 15 },
    ];

    revenueSheet.getRow(1).eachCell((cell) => {
      cell.style = getHeaderStyle();
    });

    revenueData.forEach((item) => {
      revenueSheet.addRow({
        time: item._id || item.date,
        revenue: item.totalRevenue || item.revenue,
        orders: item.totalOrders || item.orders,
      });
    });
  }

  return workbook;
};

/**
 * Xuất báo cáo giao hàng cho Shipper
 */
export const exportShipperDeliveryReport = async (deliveryStats, orders) => {
  const workbook = createWorkbook();
  
  // Sheet 1: Tổng quan giao hàng
  const summarySheet = workbook.addWorksheet('Tổng quan');
  summarySheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 35 },
    { header: 'Giá trị', key: 'value', width: 30 },
  ];
  
  summarySheet.getRow(1).eachCell((cell) => {
    cell.style = getHeaderStyle();
  });

  if (deliveryStats) {
    summarySheet.addRow({ metric: 'Tổng đơn giao', value: deliveryStats.totalDeliveries || 0 });
    summarySheet.addRow({ metric: 'Giao thành công', value: deliveryStats.successfulDeliveries || 0 });
    summarySheet.addRow({ metric: 'Giao thất bại', value: deliveryStats.failedDeliveries || 0 });
    summarySheet.addRow({ metric: 'Tỷ lệ thành công (%)', value: deliveryStats.successRate || 0 });
    summarySheet.addRow({ metric: 'Tổng COD thu (VNĐ)', value: deliveryStats.totalCODCollected || 0 });
  }

  // Sheet 2: Chi tiết đơn hàng
  if (orders && orders.length > 0) {
    const ordersSheet = workbook.addWorksheet('Chi tiết đơn hàng');
    ordersSheet.columns = [
      { header: 'Mã đơn', key: 'orderId', width: 25 },
      { header: 'Ngày giao', key: 'date', width: 20 },
      { header: 'Địa chỉ', key: 'address', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 20 },
      { header: 'COD (VNĐ)', key: 'cod', width: 20 },
    ];

    ordersSheet.getRow(1).eachCell((cell) => {
      cell.style = getHeaderStyle();
    });

    orders.forEach((order) => {
      ordersSheet.addRow({
        orderId: order.orderNumber || order._id,
        date: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('vi-VN') : 'Chưa giao',
        address: order.shippingAddress?.street || 'N/A',
        status: order.status,
        cod: order.payment?.codAmount || 0,
      });
    });
  }

  return workbook;
};
