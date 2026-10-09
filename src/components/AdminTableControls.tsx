"use client";

import { useEffect, useState } from "react";

export type TableFilter = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export function usePagedRows<T>(rows: T[], match: (row: T, query: string) => boolean, resetKey = "", pageSize = 10) {
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => match(row, normalized));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);

  useEffect(() => { setPage(1); }, [resetKey, query]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  return {
    query,
    setQuery: (value: string) => setQueryState(value),
    page: safePage,
    setPage,
    pageCount,
    filtered,
    pageRows: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}

export function AdminTableToolbar({
  query,
  onQuery,
  filters,
  onExport,
  shown,
  total,
}: {
  query: string;
  onQuery: (value: string) => void;
  filters: TableFilter[];
  onExport: () => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="admin-table-toolbar">
      <label>جستجو
        <input type="search" value={query} placeholder="عبارت را بنویسید" onChange={(event) => onQuery(event.target.value)} />
      </label>
      {filters.map((filter) => (
        <label key={filter.label}>{filter.label}
          <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
            <option value="">همه</option>
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      <button type="button" className="primary" disabled={shown === 0} onClick={onExport}>خروجی اکسل</button>
      <span>{shown} از {total}</span>
    </div>
  );
}

export function AdminPager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  return (
    <div className="admin-pager">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>قبلی</button>
      <span>صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>بعدی</button>
    </div>
  );
}
