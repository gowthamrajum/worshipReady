// src/components/SongTable.jsx
import React, { useState } from "react";
import { FiEye, FiEdit, FiChevronUp, FiChevronDown, FiDownload, FiX, FiEdit3, FiTrash } from "react-icons/fi";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import EditSong from "./EditSong";
import { deleteSong as apiDeleteSong, DELETE_PASSWORD } from "../../api/client";

export default function SongTable({
  songs,
  onPreview,
  fetchSongs,
  page,
  totalPages,
  total,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedSongIdForEdit, setSelectedSongIdForEdit] = useState(null);

  const [createdByFilter, setCreatedByFilter] = useState("");
  const [updatedByFilter, setUpdatedByFilter] = useState("");
  const [selectedSongForDelete, setSelectedSongForDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  // Edit password protection
  const [pendingEditSong, setPendingEditSong] = useState(null);
  const [editPassword, setEditPassword] = useState("");

  // Client-side sorting on current page
  const sortedSongs = [...songs].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = (a[sortConfig.key] || "").toString().toLowerCase();
    const bValue = (b[sortConfig.key] || "").toString().toLowerCase();
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Client-side column filters on current page
  const filteredSongs = sortedSongs.filter((s) => {
    const matchesCreated = s.created_by?.toLowerCase().includes(createdByFilter.toLowerCase());
    const matchesUpdated = s.last_updated_by?.toLowerCase().includes(updatedByFilter.toLowerCase());
    return matchesCreated && matchesUpdated;
  });

  const exportToExcel = (data, filename) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Songs");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`${filename}.xlsx exported successfully! 🎉`);
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Excel export failed. Check console.");
    }
  };

  const exportCurrentPage = () => {
    if (filteredSongs.length === 0) {
      toast.error("No songs found to export.");
      return;
    }
    const exportData = filteredSongs.map((row) => ({
      Name: row.song_name,
      CreatedAt: row.created_at,
      LastUpdatedAt: row.last_updated_at,
      CreatedBy: row.created_by,
      LastUpdatedBy: row.last_updated_by,
    }));
    exportToExcel(exportData, "Songs_Current_Page");
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="overflow-x-auto bg-white shadow rounded-lg mt-6">
      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center p-4 gap-4">
  {/* Rows Dropdown */}
  <div className="flex items-center gap-2">
    <label className="text-sm">Rows:</label>
    <select
      value={rowsPerPage}
      onChange={(e) => onRowsPerPageChange(parseInt(e.target.value))}
      className="border rounded px-2 py-1 text-sm"
    >
      {[5, 10, 20, 50, 100].map((size) => (
        <option key={size}>{size}</option>
      ))}
    </select>
    <span className="text-sm text-gray-500 ml-2">
      {total} total songs
    </span>
  </div>

  {/* Right Side Actions */}
        <div className="flex gap-3 flex-wrap">
            <button
            onClick={exportCurrentPage}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2"
            >
            <FiDownload /> Export Current
            </button>
            <button
            onClick={() => {
                setCreatedByFilter("");
                setUpdatedByFilter("");
                toast.success("Filters cleared!");
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm flex items-center gap-2"
            >
            <FiX /> Clear Filters
            </button>
        </div>
        </div>

      {/* Table */}
      <table className="min-w-full table-auto text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left font-semibold cursor-pointer" onClick={() => requestSort("song_name")}>
              Name {sortConfig.key === "song_name" && (sortConfig.direction === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </th>
            <th className="px-4 py-2 text-left font-semibold">Actions</th>
            <th className="px-4 py-2 text-left font-semibold">Created Time</th>
            <th className="px-4 py-2 text-left font-semibold">Last Updated Time</th>
            <th className="px-4 py-2 text-left font-semibold">
              <div className="flex items-center gap-2">
                Created By
                <input
                  value={createdByFilter}
                  onChange={(e) => setCreatedByFilter(e.target.value)}
                  placeholder="Filter"
                  className="border rounded px-2 py-1 text-xs w-24"
                />
              </div>
            </th>
            <th className="px-4 py-2 text-left font-semibold">
              <div className="flex items-center gap-2">
                Updated By
                <input
                  value={updatedByFilter}
                  onChange={(e) => setUpdatedByFilter(e.target.value)}
                  placeholder="Filter"
                  className="border rounded px-2 py-1 text-xs w-24"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredSongs.map((song) => (
            <tr key={song.song_id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{song.song_name}</td>
              <td className="px-4 py-2 flex gap-2">
                <button onClick={() => onPreview(song.song_id)} className="text-indigo-600 hover:text-indigo-900">
                    <FiEye size={18} />
                </button>
                <button
                    onClick={() => setPendingEditSong(song)}
                    className="text-green-600 hover:text-green-800"
                >
                    <FiEdit size={18} />
                </button>
                <button
                    onClick={() => setSelectedSongForDelete(song)}
                    className="text-red-600 hover:text-red-800"
                >
                    <FiTrash size={18} />
                </button>
                </td>
              <td className="px-4 py-2">{song.created_at ? new Date(song.created_at).toLocaleString() : "-"}</td>
              <td className="px-4 py-2">{song.last_updated_at ? new Date(song.last_updated_at).toLocaleString() : "-"}</td>
              <td className="px-4 py-2">{song.created_by || "System"}</td>
              <td className="px-4 py-2">{song.last_updated_by || "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between items-center px-4 py-3">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="bg-indigo-500 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <div className="flex items-center gap-2 text-gray-600">
            Page
            <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                if (!isNaN(p) && p >= 1 && p <= totalPages) {
                    onPageChange(p);
                }
                }}
                className="w-12 border rounded px-2 py-1 text-center text-sm"
            />
            of {totalPages}
            </div>
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="bg-indigo-500 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Edit Password Modal */}
        {pendingEditSong && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2 className="text-green-700 text-lg font-semibold">Confirm Edit</h2>
            <p className="text-sm text-gray-700">
                Enter password to edit <strong>{pendingEditSong.song_name}</strong>
            </p>

            <input
                type="password"
                placeholder="Enter password"
                className="w-full border px-4 py-2 rounded"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
            />

            <div className="flex justify-center gap-4 mt-4">
                <button
                onClick={() => {
                    setPendingEditSong(null);
                    setEditPassword("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                Cancel
                </button>
                <button
                onClick={() => {
                    if (editPassword !== DELETE_PASSWORD) {
                    toast.error("Incorrect password.");
                    return;
                    }
                    setSelectedSongIdForEdit(pendingEditSong.song_id);
                    setPendingEditSong(null);
                    setEditPassword("");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                Confirm
                </button>
            </div>
            </div>
        </div>
        )}

      {/* Edit Modal */}
        {selectedSongIdForEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white w-[90%] max-w-4xl p-6 rounded shadow-lg relative overflow-y-auto max-h-[90vh]">
                    <button
                    onClick={() => setSelectedSongIdForEdit(null)}
                    className="absolute right-4 top-4 text-gray-500 hover:text-red-600"
                    >
                    <FiX size={24} />
                    </button>

                    {/* Render EditSong */}
                    <EditSong
                    songId={selectedSongIdForEdit}
                    onSongUpdated={() => {
                        setSelectedSongIdForEdit(null);
                        fetchSongs();
                    }}
                    />
                </div>
                </div>
        )}
        {selectedSongForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2 className="text-red-700 text-lg font-semibold">Confirm Deletion</h2>
            <p className="text-sm text-gray-700">
                Are you sure you want to delete <strong>{selectedSongForDelete.song_name}</strong>?
            </p>

            <input
                type="password"
                placeholder="Enter password"
                className="w-full border px-4 py-2 rounded"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
            />

            <div className="flex justify-center gap-4 mt-4">
                <button
                onClick={() => {
                    setSelectedSongForDelete(null);
                    setDeletePassword("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                Cancel
                </button>
                <button
                onClick={async () => {
                    if (deletePassword !== DELETE_PASSWORD) {
                    toast.error("Incorrect password.");
                    return;
                    }
                    try {
                    await apiDeleteSong(selectedSongForDelete.song_id);
                    toast.success("✅ Song deleted successfully!");
                    setSelectedSongForDelete(null);
                    setDeletePassword("");
                    fetchSongs();
                    } catch (err) {
                    console.error(err);
                    toast.error("❌ Failed to delete song.");
                    }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                Yes, Delete
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
}
