import type { Express, Request, Response } from "express";
import { storage } from "./storage";

function generateTicketNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `TKT${timestamp}${random}`;
}

export function registerSupportRoutes(app: Express) {

  // ===== CREATE TICKET =====

  app.post("/api/user/support/tickets", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const { category, subject, description, priority, relatedId, relatedType } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ message: "القسم والموضوع والوصف مطلوبة" });
    }

    const validCategories = ["transfer", "contract", "wallet", "kyc", "account", "technical", "other"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "قسم غير صحيح" });
    }

    const ticket = await storage.createSupportTicket({
      ticketNumber: generateTicketNumber(),
      userId: req.session.userId,
      category,
      subject,
      description,
      priority: priority || "medium",
      status: "open",
      relatedId: relatedId || null,
      relatedType: relatedType || null,
    });

    // Create first message from user
    await storage.createTicketMessage({
      ticketId: ticket.id,
      senderId: req.session.userId,
      senderRole: "user",
      message: description,
      attachments: null,
    });

    res.json({ success: true, ticket });
  });

  // ===== LIST USER TICKETS =====

  app.get("/api/user/support/tickets", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const tickets = await storage.getSupportTicketsByUser(req.session.userId);
    res.json({ tickets });
  });

  // ===== TICKET DETAILS + MESSAGES =====

  app.get("/api/user/support/tickets/:id", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    if (ticket.userId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const messages = await storage.getTicketMessages(ticket.id);
    res.json({ ticket, messages });
  });

  // ===== REPLY TO TICKET =====

  app.post("/api/user/support/tickets/:id/messages", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    if (ticket.userId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (ticket.status === "closed") {
      return res.status(400).json({ message: "التذكرة مغلقة" });
    }

    const { message, attachments } = req.body;
    if (!message) {
      return res.status(400).json({ message: "الرسالة مطلوبة" });
    }

    const msg = await storage.createTicketMessage({
      ticketId: ticket.id,
      senderId: req.session.userId,
      senderRole: "user",
      message,
      attachments: attachments || null,
    });

    // Update ticket status
    await storage.updateSupportTicket(ticket.id, { status: "open" });

    res.json({ success: true, message: msg });
  });

  // ===== CLOSE TICKET =====

  app.post("/api/user/support/tickets/:id/close", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    if (ticket.userId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const updated = await storage.updateSupportTicket(ticket.id, {
      status: "closed",
      closedAt: new Date(),
    });

    res.json({ success: true, ticket: updated });
  });

  // ===== RATE SUPPORT =====

  app.post("/api/user/support/tickets/:id/rate", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    if (ticket.userId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (ticket.status !== "resolved" && ticket.status !== "closed") {
      return res.status(400).json({ message: "لا يمكن التقييم قبل الحل" });
    }

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم من 1 إلى 5" });
    }

    const updated = await storage.updateSupportTicket(ticket.id, {
      satisfactionRating: rating,
      satisfactionComment: comment || null,
    });

    res.json({ success: true, ticket: updated });
  });

  // ===== ADMIN: TICKET MANAGEMENT =====

  app.get("/api/admin/support/tickets", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const status = req.query.status as string;
    const category = req.query.category as string;

    let tickets;
    if (status) {
      tickets = await storage.getSupportTicketsByStatus(status);
    } else {
      tickets = await storage.getAllSupportTickets();
    }

    if (category) {
      tickets = tickets.filter(t => t.category === category);
    }

    res.json({ tickets });
  });

  app.get("/api/admin/support/tickets/:id", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    const messages = await storage.getTicketMessages(ticket.id);
    res.json({ ticket, messages });
  });

  app.post("/api/admin/support/tickets/:id/assign", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    const updated = await storage.updateSupportTicket(ticket.id, {
      assignedTo: req.session.userId,
      status: "in_progress",
      firstResponseAt: ticket.firstResponseAt || new Date(),
    });

    res.json({ success: true, ticket: updated });
  });

  app.post("/api/admin/support/tickets/:id/messages", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    const { message, attachments } = req.body;
    if (!message) {
      return res.status(400).json({ message: "الرسالة مطلوبة" });
    }

    const msg = await storage.createTicketMessage({
      ticketId: ticket.id,
      senderId: req.session.userId,
      senderRole: "admin",
      message,
      attachments: attachments || null,
    });

    // Update ticket status
    await storage.updateSupportTicket(ticket.id, {
      status: "waiting_user",
      firstResponseAt: ticket.firstResponseAt || new Date(),
    });

    // Notify user
    await storage.createUserNotification({
      userId: ticket.userId,
      type: "support",
      title: "رد على تذكرتك",
      message: `رد جديد على تذكرة "${ticket.subject}"`,
      relatedId: ticket.id,
    });

    res.json({ success: true, message: msg });
  });

  app.post("/api/admin/support/tickets/:id/resolve", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    const updated = await storage.updateSupportTicket(ticket.id, {
      status: "resolved",
      resolvedAt: new Date(),
    });

    await storage.createUserNotification({
      userId: ticket.userId,
      type: "support",
      title: "تم حل تذكرتك",
      message: `تم حل تذكرة "${ticket.subject}" - يرجى التقييم`,
      relatedId: ticket.id,
    });

    res.json({ success: true, ticket: updated });
  });

  app.post("/api/admin/support/tickets/:id/close", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "التذكرة غير موجودة" });

    const updated = await storage.updateSupportTicket(ticket.id, {
      status: "closed",
      closedAt: new Date(),
    });

    res.json({ success: true, ticket: updated });
  });

  app.get("/api/admin/support/stats", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const stats = await storage.getSupportStats();
    res.json(stats);
  });
}
