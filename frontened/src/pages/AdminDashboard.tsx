import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminGetJobs, adminAddJob, adminUpdateJob } from "@/lib/backendClient";
import { Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingJob, setAddingJob] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    teamOrDepartment: "",
    location: "",
    shortDescription: "",
    fullDescription: "",
    status: "public"
  });

  useEffect(() => {
    if (user.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/");
      return;
    }
    fetchJobs();
  }, [navigate]);

  const fetchJobs = async () => {
    try {
      const data = await adminGetJobs();
      setJobs(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await adminUpdateJob(id, { status: newStatus as any });
      toast.success("Job status updated!");
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingJob(true);
    try {
      await adminAddJob(formData as Partial<Job>);
      toast.success("Job added successfully!");
      setFormData({
        title: "",
        teamOrDepartment: "",
        location: "",
        shortDescription: "",
        fullDescription: "",
        status: "public"
      });
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || "Failed to add job");
    } finally {
      setAddingJob(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/CareerCompass logo design concept.png" alt="Career-Compass Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, <strong>{user.name}</strong>. Your role: <strong>{user.role}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                Responsibility: Manage job postings and monitor company growth.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Job</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" value={formData.title} onChange={handleInputChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamOrDepartment">Department</Label>
                    <Input id="teamOrDepartment" value={formData.teamOrDepartment} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={formData.location} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input id="shortDescription" value={formData.shortDescription} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullDescription">Full Description (Markdown)</Label>
                  <Textarea id="fullDescription" value={formData.fullDescription} onChange={handleInputChange} rows={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addingJob}>
                  {addingJob ? "Adding..." : "Add Job"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Jobs</CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner className="h-8 w-8 text-primary" />
              </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No jobs added yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.teamOrDepartment}</TableCell>
                        <TableCell>
                          <Select 
                            value={job.status} 
                            onValueChange={(val) => handleStatusChange(job.id, val)}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
