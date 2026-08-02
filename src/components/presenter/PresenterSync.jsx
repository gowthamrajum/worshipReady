import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiDownload, FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiSearch, FiMusic, FiBookOpen, FiEye } from "react-icons/fi";
import { fetchSongList, fetchSong, fetchPsalmChapter, fetchPsalmRange } from "../../api/client";
import { buildPresenterSession, countSlides } from "../../utils/buildPresenterSession";
import { downloadJSON } from "../../utils/downloadJSON";
import SongStructureModal from "./SongStructureModal";
import SlidePreviewModal from "./SlidePreviewModal";

const LANGS = [
  { id: "both", label: "Both" },
  { id: "telugu", label: "తెలుగు" },
  { id: "english", label: "English" },
];

/**
 * Presenter Sync — pick songs and psalms from the shared catalogue, order them,
 * and export the set as a `cantica-service` JSON that Cantica (lumen-presenter)
 * loads through Sessions ▸ Import service.
 *
 * The slides are built by buildPresenterSession, which mirrors Cantica's own
 * splitting rules — including keeping each Telugu line with its English
 * transliteration — so a song paginates identically in both apps.
 */
export default function PresenterSync() {
  const [source, setSource] = useState("songs"); // 'songs' | 'psalms'
  const [lang, setLang] = useState("both");
  const [sessionName, setSessionName] = useState("Presenter Sync Session");
  const [picks, setPicks] = useState([]);
  const [busy, setBusy] = useState(false);

  // ----- songs -----
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [songErr, setSongErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (source !== "songs") return;
    setLoadingSongs(true);
    setSongErr("");
    fetchSongList(1, 40, debounced)
      .then((res) => setSongs(res.data?.songs ?? []))
      .catch((e) => setSongErr(e?.message || "Could not reach the song catalogue"))
      .finally(() => setLoadingSongs(false));
  }, [source, debounced]);

  /** A song awaiting the structure prompt (which stanzas / what repeats). */
  const [pendingSong, setPendingSong] = useState(null);

  // Clicking Add loads the full song, then opens the structure modal — the
  // arrangement is chosen before it lands in the session, as Cantica does.
  const openSong = async (row) => {
    const id = row.song_id ?? row.id;
    setBusy(true);
    try {
      setPendingSong((await fetchSong(id)).data);
    } catch (e) {
      toast.error(`Could not load that song: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmSong = (structure) => {
    const full = pendingSong;
    setPendingSong(null);
    if (!full) return;
    setPicks((p) => [
      ...p,
      { key: `s-${full.song_id ?? full.id}-${p.length}`, type: "song", song: full, lang, structure },
    ]);
    toast.success(`Added “${full.song_name}”`);
  };

  // ----- psalms -----
  const [chapter, setChapter] = useState(23);
  const [startVerse, setStartVerse] = useState("");
  const [endVerse, setEndVerse] = useState("");

  const addPsalm = async () => {
    const ch = Math.max(1, Math.min(150, Number(chapter) || 1));
    setBusy(true);
    try {
      const useRange = String(startVerse).trim() !== "" && String(endVerse).trim() !== "";
      if (useRange && Number(startVerse) > Number(endVerse)) {
        toast.error("Beginning verse must be less than or equal to ending verse.");
        return;
      }
      const res = useRange
        ? await fetchPsalmRange(ch, Number(startVerse), Number(endVerse))
        : await fetchPsalmChapter(ch);
      const verses = res.data ?? [];
      if (!verses.length) {
        toast.error("No verses came back for that reference.");
        return;
      }
      setPicks((p) => [
        ...p,
        { key: `p-${ch}-${p.length}`, type: "psalm", chapter: ch, verses, lang },
      ]);
      toast.success(`Added Psalm ${ch}${useRange ? `:${startVerse}-${endVerse}` : ""}`);
    } catch (e) {
      toast.error(`Could not load that psalm: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ----- selection -----
  const removeAt = (i) => setPicks((p) => p.filter((_, j) => j !== i));
  const moveAt = (i, dir) =>
    setPicks((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = p.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const setPickLang = (i, l) =>
    setPicks((p) => p.map((x, j) => (j === i ? { ...x, lang: l } : x)));
  /** Mark a song as the offering song — Cantica drops it at the Offerings slot
   *  instead of into the worship block. */
  const toggleOffering = (i) =>
    setPicks((p) => p.map((x, j) => (j === i ? { ...x, offering: !x.offering } : x)));

  // Which item the preview is showing: an item id, 'all', or null for closed.
  const [previewing, setPreviewing] = useState(null);

  // Built on every change so the summary and the download agree.
  const envelope = useMemo(() => buildPresenterSession(sessionName, picks), [sessionName, picks]);
  const slideCount = countSlides(envelope);
  const itemCount = envelope.service.items.length;

  const doExport = () => {
    if (!picks.length) return;
    if (!slideCount) {
      toast.error("Nothing to export — the picks produced no slides in this language.");
      return;
    }
    const safe = (sessionName || "Presenter Sync Session").replace(/[\\/:*?"<>|]+/g, " ").trim();
    downloadJSON(envelope, `${safe}.cantica.json`);
    toast.success(`Exported ${slideCount} slides — load it in Cantica`);
  };

  const labelFor = (p) =>
    p.type === "song"
      ? p.song.song_name
      : `Psalm ${p.chapter}${p.verses?.length ? ` (${p.verses.length} verses)` : ""}`;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Session name</label>
          <input
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Presenter Sync Session"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lyric language</label>
          <div className="flex rounded overflow-hidden border">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={`px-3 py-2 text-sm ${
                  lang === l.id ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
                title="Applies to the next item you add"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={doExport}
          disabled={!picks.length || busy}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-40"
          title="Download a cantica-service JSON for Cantica"
        >
          <FiDownload /> Export for Cantica
        </button>
        <button
          onClick={() => setPreviewing("all")}
          disabled={!picks.length}
          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-40"
          title="See every slide as Cantica will show it"
        >
          <FiEye /> Preview
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ---------- source ---------- */}
        <div className="border rounded p-4">
          <div className="flex space-x-2 mb-4">
            {[
              ["songs", "Songs"],
              ["psalms", "Psalms"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSource(id)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  source === id ? "bg-indigo-200 text-indigo-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {source === "songs" ? (
            <>
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  className="w-full border rounded pl-9 pr-3 py-2 focus:outline-none focus:ring"
                  placeholder="Search the song catalogue"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {loadingSongs && <p className="text-sm text-gray-500">Loading…</p>}
              {songErr && <p className="text-sm text-red-600">{songErr}</p>}
              {!loadingSongs && !songErr && songs.length === 0 && (
                <p className="text-sm text-gray-500">No matches.</p>
              )}
              <div className="max-h-80 overflow-auto divide-y">
                {songs.map((s) => (
                  <div key={s.song_id ?? s.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                      <FiMusic className="text-indigo-500 shrink-0" />
                      <span className="truncate">{s.song_name}</span>
                    </span>
                    <button
                      onClick={() => openSong(s)}
                      disabled={busy}
                      className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-40"
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Chapter</label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    className="w-24 border rounded px-2 py-1.5"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From verse</label>
                  <input
                    type="number"
                    min={1}
                    className="w-24 border rounded px-2 py-1.5"
                    value={startVerse}
                    onChange={(e) => setStartVerse(e.target.value)}
                    placeholder="all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To verse</label>
                  <input
                    type="number"
                    min={1}
                    className="w-24 border rounded px-2 py-1.5"
                    value={endVerse}
                    onChange={(e) => setEndVerse(e.target.value)}
                    placeholder="all"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Leave the verses blank for the whole chapter. A psalm is added with its
                Responsive Reading title card, matching Cantica.
              </p>
              <button
                onClick={addPsalm}
                disabled={busy}
                className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-40"
              >
                <FiPlus /> Add psalm
              </button>
            </div>
          )}
        </div>

        {/* ---------- selection ---------- */}
        <div className="border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Session</h3>
            <span className="text-xs text-gray-500">
              {itemCount} item{itemCount === 1 ? "" : "s"} · {slideCount} slide
              {slideCount === 1 ? "" : "s"}
            </span>
          </div>

          {picks.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing picked yet. Add songs or psalms from the left, then export.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {picks.map((p, i) => (
                <div key={p.key} className="flex items-center gap-2 border rounded px-2 py-1.5">
                  <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                  {p.type === "song" ? (
                    <FiMusic className="text-indigo-500 shrink-0" />
                  ) : (
                    <FiBookOpen className="text-emerald-600 shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-gray-800 truncate" title={labelFor(p)}>
                    {labelFor(p)}
                  </span>
                  <select
                    className="text-xs border rounded px-1 py-0.5"
                    value={p.lang}
                    onChange={(e) => setPickLang(i, e.target.value)}
                    title="Lyric language for this item"
                  >
                    {LANGS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  {p.type === "song" && (
                    <button
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        p.offering
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-400 hover:text-gray-600"
                      }`}
                      onClick={() => toggleOffering(i)}
                      title={
                        p.offering
                          ? "This is the offering song — Cantica puts it at Offerings"
                          : "Mark as the offering song"
                      }
                    >
                      Offering
                    </button>
                  )}
                  <button
                    className="text-gray-500 hover:text-indigo-700"
                    onClick={() => setPreviewing(envelope.service.items[i]?.id ?? "all")}
                    title="Preview these slides"
                  >
                    <FiEye />
                  </button>
                  <button className="text-gray-500 hover:text-indigo-700 disabled:opacity-30"
                          onClick={() => moveAt(i, -1)} disabled={i === 0} title="Move up">
                    <FiChevronUp />
                  </button>
                  <button className="text-gray-500 hover:text-indigo-700 disabled:opacity-30"
                          onClick={() => moveAt(i, 1)} disabled={i === picks.length - 1} title="Move down">
                    <FiChevronDown />
                  </button>
                  <button className="text-gray-500 hover:text-red-600" onClick={() => removeAt(i)} title="Remove">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 border-t pt-3 leading-relaxed">
            <b>Load it in Cantica:</b> Sessions ▸ ⋯ menu ▸ <i>Import service (JSON / ZIP)</i>,
            then pick the downloaded <code>.cantica.json</code>. Songs keep each Telugu line
            with its English transliteration on the same slide, exactly as Cantica splits them.
          </div>
        </div>
      </div>

      {previewing && (
        <SlidePreviewModal
          envelope={envelope}
          onlyItemId={previewing === "all" ? null : previewing}
          onClose={() => setPreviewing(null)}
        />
      )}

      {pendingSong && (
        <SongStructureModal
          song={pendingSong}
          lang={lang}
          onCancel={() => setPendingSong(null)}
          onConfirm={confirmSong}
        />
      )}
    </div>
  );
}
