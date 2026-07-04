import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../ProductCard';
import useCartStore from '../../store/cartStore';

jest.mock('../../store/cartStore');

const mockProduct = {
  _id: '1',
  title: 'Test Product',
  description: 'Test description',
  price: 100000,
  salePrice: 80000,
  images: ['test-image.jpg'],
  ratingAvg: 4.5,
  reviewCount: 10,
  soldCount: 50,
  slug: 'test-product',
};

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProductCard Component', () => {
  const mockAddItem = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCartStore.mockReturnValue({
      addItem: mockAddItem,
    });
  });

  test('should render product information', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/100\.000/)).toBeInTheDocument();
    expect(screen.getByText(/80\.000/)).toBeInTheDocument();
  });

  test('should display product image', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Test Product');
  });

  test('should show discount percentage', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const discount = ((mockProduct.price - mockProduct.salePrice) / mockProduct.price) * 100;
    expect(screen.getByText(new RegExp(`${Math.round(discount)}%`))).toBeInTheDocument();
  });

  test('should display rating and review count', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  test('should display sold count', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  test('should add product to cart when button clicked', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    expect(mockAddItem).toHaveBeenCalledWith(mockProduct, 1);
  });

  test('should link to product detail page', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/test-product');
  });

  test('should render without sale price', () => {
    const productWithoutSale = { ...mockProduct, salePrice: undefined };
    renderWithRouter(<ProductCard product={productWithoutSale} />);

    expect(screen.getByText(/100\.000/)).toBeInTheDocument();
  });

  test('should render without rating', () => {
    const productWithoutRating = { ...mockProduct, ratingAvg: 0, reviewCount: 0 };
    renderWithRouter(<ProductCard product={productWithoutRating} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
