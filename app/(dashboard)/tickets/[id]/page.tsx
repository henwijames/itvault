"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiMessage2Line,
  RiTimeLine,
  RiSendPlaneLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@remixicon/react";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserLookup {
  id: string;
  name: string;
  email: string;
}

export default function TicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { hasPermission, user } = useAuth();

  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usersList, setUsersList] = useState<UserLookup[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  const fetchTicket = useCallback(async (): Promise<void> => {
    try {
      const res = await axios.get(`/api/tickets/${id}`);
      setTicket(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ticket details");
      router.push("/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchUsers = async (): Promise<void> => {
    try {
      const usersRes = await axios.get<UserLookup[]>("/api/users");
      setUsersList(usersRes.data);
    } catch (uErr) {
      console.warn("Failed to fetch users list (likely due to permissions):", uErr);
      if (user) {
        setUsersList([{ id: user.id, name: user.name, email: user.email }]);
      }
    }
  };

  useEffect(() => {
    fetchTicket();
    fetchUsers();
  }, [fetchTicket, user]);

  const handlePostComment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      await axios.post(`/api/tickets/${id}/comments`, { comment: newComment });
      setNewComment("");
      toast.success("Comment added!");
      fetchTicket();
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const updateField = async (field: "status" | "priority" | "assignedToId", value: string): Promise<void> => {
    const payload = { [field]: value === "unassigned" ? null : value };
    const toastId = toast.loading(`Updating ${field}...`);
    try {
      await axios.patch(`/api/tickets/${id}`, payload);
      toast.success(`Ticket ${field} updated!`, { id: toastId });
      fetchTicket();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update ${field}`, { id: toastId });
    }
  };

  // Status Badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 font-semibold text-xs py-0.5">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 font-semibold text-xs py-0.5">In Progress</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 font-semibold text-xs py-0.5">Pending</Badge>;
      case "RESOLVED":
        return (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5">
            <RiCheckboxCircleLine className="size-3 text-emerald-600" /> Resolved
          </Badge>
        );
      case "CLOSED":
        return <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200 font-semibold text-xs py-0.5">Closed</Badge>;
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5">
            <RiCloseCircleLine className="size-3 text-rose-600" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Priority Badge helper
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-semibold text-xs py-0.5">Low</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 font-semibold text-xs py-0.5">Medium</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200 font-semibold text-xs py-0.5">High</Badge>;
      case "CRITICAL":
        return (
          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-bold text-xs py-0.5 animate-pulse">
            <RiAlertLine className="size-3 text-rose-600" /> Critical
          </Badge>
        );
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  if (!hasPermission("tickets", "view")) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You do not have permission to view tickets.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center bg-background/50">
        <div className="text-muted-foreground text-sm font-medium">Loading ticket details...</div>
      </main>
    );
  }

  if (!ticket) return null;

  const canEdit = hasPermission("tickets", "edit");

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50 overflow-y-auto">
      {/* Header and Back navigation */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/tickets")}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <RiArrowLeftLine className="size-4" />
          Back to Tickets
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                {ticket.ticketNumber}
              </span>
              {renderStatusBadge(ticket.status)}
              {renderPriorityBadge(ticket.priority)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Reported by <span className="font-medium text-foreground">{ticket.createdBy.name}</span> on {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Details and Comments Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Content & comments */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Description Card */}
          <Card className="p-6 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>
          </Card>

          {/* Discussion section */}
          <Card className="p-6 flex flex-col gap-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <RiMessage2Line className="size-4.5 text-primary" />
              Discussion Thread ({ticket.comments.length})
            </h3>

            {/* Comment timeline */}
            <div className="flex flex-col gap-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No comments have been posted yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {ticket.comments.map((comment: any) => (
                    <div key={comment.id} className="flex flex-col p-4 rounded-lg bg-muted/30 border text-sm gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-primary">{comment.user.name}</span>
                        <span className="text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="post-comment" className="text-sm font-semibold">Post a Reply</Label>
                <Textarea
                  id="post-comment"
                  placeholder="Type updates, questions or solutions..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px] text-sm leading-relaxed"
                />
              </div>
              <Button type="submit" disabled={commentSubmitting || !newComment.trim()} className="w-fit self-end">
                <RiSendPlaneLine className="size-4" data-icon="inline-start" />
                Submit Comment
              </Button>
            </form>
          </Card>
        </div>

        {/* Right column - Ticket settings & activities */}
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
          {/* Ticket Properties */}
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
            
            <div className="flex flex-col gap-4">
              {/* Status Selector */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                <Select
                  disabled={!canEdit}
                  onValueChange={(val) => updateField("status", val)}
                  value={ticket.status}
                >
                  <SelectTrigger className="w-full h-10 bg-background font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Selector */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
                <Select
                  disabled={!canEdit}
                  onValueChange={(val) => updateField("priority", val)}
                  value={ticket.priority}
                >
                  <SelectTrigger className="w-full h-10 bg-background font-medium">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Selector */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Assignee</Label>
                <Select
                  disabled={!canEdit}
                  onValueChange={(val) => updateField("assignedToId", val)}
                  value={ticket.assignedToId || "unassigned"}
                >
                  <SelectTrigger className="w-full h-10 bg-background font-medium">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Ticket details */}
            <div className="flex flex-col gap-3.5 text-xs font-medium text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Branch Location</span>
                <span className="text-foreground font-semibold">{ticket.branch.name}</span>
              </div>
              {ticket.staff && (
                <div className="flex justify-between items-center">
                  <span>Affected Staff</span>
                  <span className="text-foreground font-semibold">
                    {ticket.staff.firstName} {ticket.staff.lastName}
                  </span>
                </div>
              )}
              {ticket.category && (
                <div className="flex justify-between items-center">
                  <span>Category</span>
                  <span className="text-foreground font-semibold">{ticket.category.name}</span>
                </div>
              )}
              {ticket.responseDueAt && (
                <div className="flex justify-between items-center">
                  <span>Due Date</span>
                  <span className="text-foreground font-semibold">{ticket.responseDueAt}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span>Resolved On</span>
                  <span className="text-emerald-700 font-semibold">{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Activity Log Audit */}
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <RiTimeLine className="size-4" />
              Activity Audits
            </h3>
            
            <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {ticket.activities.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No audits logged.</span>
              ) : (
                ticket.activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-2 items-start text-xs border-l-2 border-primary/20 pl-2.5 py-0.5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground font-medium text-[10px]">
                          {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold text-primary uppercase text-[8px] bg-primary/5 px-1 py-0.2 rounded border border-primary/10 shrink-0">
                          {activity.action}
                        </span>
                      </div>
                      <span className="text-foreground font-medium leading-normal">{activity.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
