import React, { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash2, X, Code, Copy, Check } from "lucide-react";
import { api } from "../../api";

interface WebEmbedItem {
  id: string;
  name: string;
  facility: string;
  providers: string[];
  websites: string;
  code: string;
}

export function WebEmbedPage() {
  const [embeds, setEmbeds] = useState<WebEmbedItem[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [selFacility, setSelFacility] = useState("");
  const [showFacDetails, setShowFacDetails] = useState("yes");
  const [showProviders, setShowProviders] = useState("yes");
  const [selProviders, setSelProviders] = useState<string[]>([]);
  const [websites, setWebsites] = useState("www.healurheart.com");

  const loadData = async () => {
    try {
      setLoading(true);
      const [embList, facList] = await Promise.all([
        api<WebEmbedItem[]>("/calendar/web-embeds"),
        api<any[]>("/facilities"),
      ]);
      setEmbeds(embList || []);
      setFacilities(facList || []);
      if (facList && facList.length > 0) {
        setSelFacility(facList[0].name);
      }
    } catch (err) {
      console.error("Failed loading web embed data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchCode = selFacility.toLowerCase().includes("neelankarai") ? "HUH001" : "HUH002";
    const iframeCode = `<iframe src="https://ehr.healyourheart.in/book/embed?branch=${branchCode}" width="100%" height="600" style="overflow:hidden;" frameborder="0"></iframe>`;

    const payload: WebEmbedItem = {
      id: "embed-" + Date.now(),
      name: `Web Embed ${embeds.length + 1}`,
      facility: selFacility || "Heal Your Heart Neelankarai - HUH001",
      providers: selProviders.length > 0 ? selProviders : ["Dr. Ramasamy S"],
      websites: websites || "www.healurheart.com",
      code: iframeCode,
    };

    try {
      await api("/admin/calendar/web-embeds", "POST", payload);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Failed to save web embed: " + (err.detail || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this web embed configuration?")) return;
    try {
      await api(`/admin/calendar/web-embeds/${id}`, "DELETE");
      setActiveMenuId(null);
      loadData();
    } catch (err: any) {
      alert("Failed to delete web embed: " + (err.detail || err.message));
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0" }}>
            Web Embed
          </h2>
          <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, maxWidth: 820 }}>
            Web Embed allows you to embed online booking widgets on your practice website so patients can schedule appointments directly.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            backgroundColor: "#d97706",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Plus size={15} />
          <span>Add New</span>
        </button>
      </div>

      {/* Embed Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {embeds.map((emb, idx) => (
          <div
            key={emb.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              padding: "16px 20px",
              background: "#fff",
              display: "grid",
              gridTemplateColumns: "320px 1fr 40px",
              gap: 20,
              alignItems: "start",
            }}
          >
            {/* Meta */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0d9488", margin: "0 0 10px 0" }}>
                {emb.name || `Web Embed ${idx + 1}`}
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: "#64748b", width: 90, display: "inline-block" }}>Facility:</span>
                  <strong style={{ color: "#334155" }}>{emb.facility}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", width: 90, display: "inline-block" }}>Provider(s):</span>
                  <span style={{ color: "#334155" }}>{emb.providers?.join(", ") || "Dr. Ramasamy S"}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b", width: 90, display: "inline-block" }}>Hosting Site:</span>
                  <span style={{ color: "#166eb8" }}>{emb.websites}</span>
                </div>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#0d9488",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "3px 3px 0 0",
                }}
              >
                <Code size={13} />
                <span>Embed code snippet</span>
              </div>
              <div style={{ position: "relative" }}>
                <textarea
                  readOnly
                  value={emb.code}
                  rows={3}
                  style={{
                    width: "100%",
                    fontSize: 12,
                    fontFamily: "monospace",
                    padding: "8px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "0 4px 4px 4px",
                    background: "#f8fafc",
                    color: "#334155",
                    boxSizing: "border-box",
                    resize: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCopyCode(emb.id, emb.code)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    padding: "3px 8px",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Copy snippet"
                >
                  {copiedId === emb.id ? (
                    <>
                      <Check size={12} color="#10b981" />
                      <span style={{ color: "#10b981" }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action */}
            <div style={{ position: "relative", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setActiveMenuId(activeMenuId === emb.id ? null : emb.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 4,
                }}
              >
                <MoreVertical size={16} />
              </button>

              {activeMenuId === emb.id && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 28,
                    background: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    zIndex: 50,
                    minWidth: 100,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDelete(emb.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#dc2626",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 4,
              padding: 24,
              width: 520,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Create Web Embed</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Choose Facility *
                  </label>
                  <select
                    value={selFacility}
                    onChange={(e) => setSelFacility(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                    }}
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Show Facility Details:
                    </label>
                    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="facDetails"
                          checked={showFacDetails === "yes"}
                          onChange={() => setShowFacDetails("yes")}
                        />
                        Yes
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="facDetails"
                          checked={showFacDetails === "no"}
                          onChange={() => setShowFacDetails("no")}
                        />
                        No
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Show Providers:
                    </label>
                    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="provDetails"
                          checked={showProviders === "yes"}
                          onChange={() => setShowProviders("yes")}
                        />
                        Yes
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="provDetails"
                          checked={showProviders === "no"}
                          onChange={() => setShowProviders("no")}
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Hosting Website(s) *
                  </label>
                  <textarea
                    rows={2}
                    value={websites}
                    onChange={(e) => setWebsites(e.target.value)}
                    placeholder="e.g. www.healurheart.com"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                      boxSizing: "border-box",
                    }}
                  />
                  <small style={{ fontSize: 11, color: "#64748b" }}>
                    Enter each authorized website domain on a separate line.
                  </small>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#d97706",
                      color: "#fff",
                      border: "none",
                      padding: "8px 24px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      padding: "8px 18px",
                      fontSize: 13,
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

