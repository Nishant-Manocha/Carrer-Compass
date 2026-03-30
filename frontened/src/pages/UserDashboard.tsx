import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserApplications, fetchPublicJobs } from "@/lib/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Briefcase, Clock, FileText, ExternalLink } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function UserDashboard() {
  const [dbApplications, setDbApplications] = useState<any[]>([]);
  const [localApplications, setLocalApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      toast.error("Please login to view your dashboard");
      navigate("/login");
      return;
    }
    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      // 1. Fetch from Database (Primary source)
      const db = await getUserApplications();

      // 2. Fetch live jobs data to merge metadata, bypassing backend bugs
      const allJobs = await fetchPublicJobs().catch(() => []);
      const jobsMap = new Map<string, any>(allJobs.map((j: any) => [String(j.id), j]));

      // 3. Fetch from Local Storage (Fallback for newly applied jobs not yet synced)
      const local = JSON.parse(localStorage.getItem("myApplications") || "[]");
      const localMap = new Map<string, any>(local.map((l: any) => [String(l.jobId), l]));

      // Enrich the DB applications prioritizing live jobs fetch, then local storage
      const enrichedDb = db.map((app: any) => {
        const localData = localMap.get(String(app.jobId));
        const jobData = jobsMap.get(String(app.jobId));
        return {
          ...app,
          jobTitle: app.jobTitle || jobData?.title || localData?.jobTitle || "Applied Job",
          jobShortDescription: app.jobShortDescription || jobData?.shortDescription || localData?.jobShortDescription || "Details unavailable..."
        };
      });

      // Filter local applications to only those that aren't in the DB yet
      const dbJobIds = new Set(enrichedDb.map((app: any) => String(app.jobId)));
      const uniqueLocal = local.filter((app: any) => !dbJobIds.has(String(app.jobId)));

      // 3. Combine them
      const mergedApplications = [...enrichedDb, ...uniqueLocal].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setDbApplications(mergedApplications);
      setLocalApplications([]); 
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/CareerCompass logo design concept.png" alt="Career-Compass Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, <strong>{user.name}</strong>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                  <h3 className="text-2xl font-bold">{dbApplications.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
            <CardDescription>
              A list of all jobs you've applied for, synchronized between your browser and our servers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <LoadingSpinner className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading your applications...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show merged and unique applications */}
                  {dbApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        You haven't applied for any jobs yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dbApplications.map((app, index) => (
                      <TableRow key={app._id || `app-${index}`}>
                        <TableCell className="font-mono text-xs">{app.jobId}</TableCell>
                        <TableCell className="font-medium">
                          {app.jobTitle || "Applied Job"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {app.jobShortDescription || "Details unavailable..."}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1 text-xs"
                            onClick={() => navigate(`/jobs/${app.jobId}`)}
                          >
                            Know More <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
