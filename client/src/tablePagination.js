import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 'all'];

export const useTablePagination = (items, initialPageSize = 10) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPageSize);
  const list = Array.isArray(items) ? items : [];
  const showAll = size === 'all';
  const pageSize = showAll ? Math.max(list.length, 1) : Number(size) || 10;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const indexOfLastItem = showAll ? list.length : Math.min(currentPage * pageSize, list.length);
  const indexOfFirstItem = showAll ? 0 : Math.max(0, indexOfLastItem - pageSize);
  const currentItems = list.slice(indexOfFirstItem, indexOfLastItem);

  const setItemsPerPage = (value) => {
    setSize(value === 'all' ? 'all' : Number(value));
    setPage(1);
  };

  return {
    currentPage,
    setCurrentPage: setPage,
    itemsPerPage: size,
    setItemsPerPage,
    currentItems,
    indexOfFirstItem,
    indexOfLastItem,
    totalPages,
    showAll
  };
};
