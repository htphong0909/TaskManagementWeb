"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { marked } from "marked";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  details: string | null;
  key_info: string | null;
  stakeholders: Stakeholder[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  file_id: string | null;
}

interface CardDetailModalProps {
  cardId: string;
  listTitle: string;
  onClose: () => void;
  onCardUpdated: () => void;
}

export default function CardDetailModal({
  cardId,
  listTitle,
  onClose,
  onCardUpdated,
}: CardDetailModalProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [details, setDetails] = useState("");
  const [keyInfo, setKeyInfo] = useState("");
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Stakeholder form input states
  const [newShName, setNewShName] = useState("");
  const [newShRole, setNewShRole] = useState("");
  const [newShEmail, setNewShEmail] = useState("");
  const [isAddingSh, setIsAddingSh] = useState(false);

  // Markdown Mode Toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDescPreview, setIsDescPreview] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Tự động giãn nở chiều cao textarea Mô tả công việc
  useEffect(() => {
    const textarea = descRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  const fetchCardData = useCallback(async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (data && !error) {
      setCard(data);
      setTitle(data.title || "");
      setContent(data.content || "");
      setDetails(data.details || "");
      setKeyInfo(data.key_info || "");
      setStakeholders(data.stakeholders || []);
    }

    const { data: attData } = await supabase
      .from("attachments")
      .select("*")
      .eq("card_id", cardId);
    setAttachments(attData || []);
  }, [cardId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCardData]);

  // Hàm lưu trường dữ liệu đơn lẻ (Title, Content, Details, Key Info)
  const saveField = useCallback(async (field: keyof Card, value: string | Stakeholder[]) => {
    try {
      const { error } = await supabase
        .from("cards")
        .update({ [field]: value })
        .eq("id", cardId);
      if (error) throw error;
      onCardUpdated();
    } catch (err) {
      console.error(`Lỗi cập nhật ${field}:`, err);
    }
  }, [cardId, onCardUpdated]);

  // Thêm Stakeholder
  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShName.trim()) return;

    const newSh: Stakeholder = {
      id: crypto.randomUUID(),
      name: newShName.trim(),
      role: newShRole.trim(),
      email: newShEmail.trim(),
    };

    const updatedList = [...stakeholders, newSh];
    setStakeholders(updatedList);
    await saveField("stakeholders", updatedList);

    setNewShName("");
    setNewShRole("");
    setNewShEmail("");
    setIsAddingSh(false);
  };

  // Xóa Stakeholder
  const handleDeleteStakeholder = async (shId: string) => {
    const updatedList = stakeholders.filter(sh => sh.id !== shId);
    setStakeholders(updatedList);
    await saveField("stakeholders", updatedList);
  };

  // File Attachments upload
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload thất bại");
      const fileData = await res.json();
      
      const { error } = await supabase
        .from("attachments")
        .insert([{
          card_id: cardId,
          name: fileData.name,
          url: fileData.url,
          file_id: fileData.fileId,
          mime_type: fileData.mimeType,
        }]);

      if (error) throw error;
      fetchCardData();
    } catch (err) {
      alert("Lỗi upload file: " + err);
    } finally {
      setUploadingFile(false);
    }
  };

  // Xử lý chèn ảnh vào Markdown
  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload ảnh thất bại");
      const fileData = await res.json();

      // Convert Google Drive Link sang API Proxy Link
      const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
      const imageMarkdown = `\n![${fileData.name}](${directUrl})\n`;

      // 1. Lưu metadata vào bảng attachments để quản lý và tránh file mồ côi
      const { error: dbError } = await supabase
        .from("attachments")
        .insert([{
          card_id: cardId,
          name: fileData.name,
          url: directUrl,
          file_id: fileData.fileId,
          mime_type: fileData.mimeType,
        }]);
      if (dbError) throw dbError;

      // 2. Chèn vào vị trí con trỏ chuột
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newDetails = details.substring(0, start) + imageMarkdown + details.substring(end);
        setDetails(newDetails);
        await saveField("details", newDetails);
      } else {
        const newDetails = details + imageMarkdown;
        setDetails(newDetails);
        await saveField("details", newDetails);
      }

      // 3. Cập nhật lại thông tin thẻ
      fetchCardData();
    } catch (err) {
      alert("Lỗi chèn ảnh: " + err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Trình phân tích markdown using marked
  const renderMarkdown = (text: string) => {
    if (!text) return "<p class='text-slate-400 italic'>Chưa có thông tin chi tiết.</p>";
    return marked.parse(text, { breaks: true, gfm: true }) as string;
  };

  // Thêm sự kiện paste ảnh trực tiếp vào textarea chi tiết công việc
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isPreviewMode) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          e.preventDefault(); // Ngăn hành vi dán mặc định (text)
          setUploadingImage(true);
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload dán ảnh thất bại");
            const fileData = await res.json();

            const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
            const imageMarkdown = `\n![Pasted Image](${directUrl})\n`;

            // 1. Lưu metadata vào bảng attachments
            const { error: dbError } = await supabase
              .from("attachments")
              .insert([{
                card_id: cardId,
                name: fileData.name,
                url: directUrl,
                file_id: fileData.fileId,
                mime_type: fileData.mimeType,
              }]);
            if (dbError) throw dbError;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newDetails = details.substring(0, start) + imageMarkdown + details.substring(end);
            setDetails(newDetails);
            await saveField("details", newDetails);

            // 2. Cập nhật lại thông tin thẻ
            fetchCardData();
          } catch (err) {
            alert("Lỗi dán ảnh: " + err);
          } finally {
            setUploadingImage(false);
          }
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => {
      textarea.removeEventListener("paste", handlePaste);
    };
  }, [details, isPreviewMode, saveField, cardId, fetchCardData]);

  if (!card) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Ẩn inputs file */}
      <input type="file" ref={fileInputRef} onChange={handleFileAttach} className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />

      <div className="bg-white border border-slate-200/80 rounded-2xl w-[96vw] h-[92vh] max-w-[1600px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveField("title", title)}
              className="text-base font-bold text-slate-950 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 focus:ring-0 outline-none w-full py-0.5"
            />
            <div className="text-xs text-slate-400 mt-1">
              nằm trong cột: <strong className="text-violet-600">{listTitle}</strong>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer">
            ✕
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          <div className="grid grid-cols-3 gap-6">
            
            {/* CỘT TRÁI (Nội dung chính - 2/3 width) */}
            <div className="col-span-2 flex flex-col gap-6">
              
              {/* Mô tả công việc */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">📝 Mô Tả Công Việc (Markdown)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDescPreview(false)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${!isDescPreview ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Soạn thảo
                    </button>
                    <button
                      onClick={() => setIsDescPreview(true)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${isDescPreview ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {!isDescPreview ? (
                  <textarea
                    ref={descRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={() => saveField("content", content)}
                    placeholder="Nhập mô tả tóm tắt..."
                    className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-violet-400 min-h-16 resize-none break-words overflow-hidden"
                  />
                ) : (
                  <div
                    onClick={() => setIsDescPreview(false)}
                    className="border border-slate-200 rounded-lg p-3 bg-white min-h-16 max-w-none text-xs markdown-content cursor-pointer hover:bg-slate-50/30 transition duration-150"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                )}
              </div>

              {/* Chi tiết công việc (Markdown Editor) */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📖 Chi tiết công việc (Markdown / HackMD)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPreviewMode(false)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${!isPreviewMode ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Soạn thảo
                    </button>
                    <button
                      onClick={() => setIsPreviewMode(true)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${isPreviewMode ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {!isPreviewMode ? (
                  <div className="space-y-2">
                    {/* Toolbar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex gap-2 items-center text-xs">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        {uploadingImage ? "Đang upload..." : "🖼️ Chèn ảnh từ máy"}
                      </button>
                      <span className="text-[10px] text-slate-400 ml-auto italic">Kéo thả / Dán ảnh trực tiếp</span>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      onBlur={() => saveField("details", details)}
                      placeholder="Viết chi tiết kế hoạch của bạn ở đây bằng Markdown..."
                      className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-3 min-h-[220px] focus:border-violet-400 outline-none font-mono break-words"
                    />
                  </div>
                ) : (
                  <div
                    className="border border-slate-200 rounded-lg p-4 bg-white min-h-[260px] max-w-none text-xs markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(details) }}
                  />
                )}
              </div>

              {/* Stakeholders Table */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">👥 Stakeholders (Các bên liên quan)</label>
                  {!isAddingSh && (
                    <button
                      onClick={() => setIsAddingSh(true)}
                      className="text-xs text-violet-600 hover:text-violet-500 font-semibold cursor-pointer"
                    >
                      + Thêm bên liên quan
                    </button>
                  )}
                </div>

                {isAddingSh && (
                  <form onSubmit={handleAddStakeholder} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="Họ tên..."
                        value={newShName}
                        onChange={(e) => setNewShName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Vai trò..."
                        value={newShRole}
                        onChange={(e) => setNewShRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email..."
                        value={newShEmail}
                        onChange={(e) => setNewShEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div className="col-span-3 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setIsAddingSh(false)} className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-600 cursor-pointer">
                        Hủy
                      </button>
                      <button type="submit" className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 rounded-md font-semibold text-white cursor-pointer shadow-sm">
                        Lưu
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="pb-2">Tên</th>
                      <th className="pb-2">Vai trò</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stakeholders.map((sh) => (
                      <tr key={sh.id}>
                        <td className="py-2.5 font-semibold text-slate-950">{sh.name}</td>
                        <td className="py-2.5">
                          <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            {sh.role || "N/A"}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-900">{sh.email || "N/A"}</td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => handleDeleteStakeholder(sh.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer text-sm">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stakeholders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400 italic text-center">
                          Chưa có bên liên quan nào được định nghĩa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* CỘT PHẢI (Ghi chú & File đính kèm - 1/3 width) */}
            <div className="col-span-1 flex flex-col gap-6">
              
              {/* Key Info */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800">💡 Key Info (Lưu ý đặc biệt)</label>
                <textarea
                  value={keyInfo}
                  onChange={(e) => setKeyInfo(e.target.value)}
                  onBlur={() => saveField("key_info", keyInfo)}
                  placeholder="Ghi lại các ghi chú, mật khẩu, hoặc cảnh báo dự án..."
                  className="w-full text-xs text-slate-950 bg-transparent border-0 resize-y min-h-[160px] outline-none placeholder-amber-600/50 leading-relaxed font-sans break-words"
                />
              </div>

              {/* Attachments */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📎 File đính kèm</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="text-xs text-violet-600 hover:text-violet-500 font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {uploadingFile ? "Đang đính kèm..." : "+ Thêm tệp"}
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 truncate max-w-[130px] font-medium">
                        {att.name}
                      </a>
                      {/* Xóa file đính kèm */}
                      <button
                        onClick={async () => {
                          if (att.file_id) {
                            // Gọi API xóa file vật lý trên Google Drive
                            const res = await fetch(`/api/attachments/delete?fileId=${att.file_id}`, {
                              method: "DELETE"
                            });
                            if (!res.ok) {
                              console.warn("Thất bại khi xóa file trên Google Drive");
                            }
                          }
                          const { error } = await supabase.from("attachments").delete().eq("id", att.id);
                          if (!error) fetchCardData();
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic">Chưa có tệp nào được đính kèm.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
