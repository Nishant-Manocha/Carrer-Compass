import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getUserApplications } from "@/lib/backendClient";
import { getPublicJobs } from "@/lib/api"; // To populate local storage jobs
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, Clock, FileText, ExternalLink } from "lucide-react";

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
      // 1. Fetch from Local Storage first
      const local = JSON.parse(localStorage.getItem("myApplications") || "[]");
      const allJobs = getPublicJobs();
      
      const enhancedLocal = local.map((app: any) => {
        const job = allJobs.find(j => j.id === app.jobId);
        return {
          ...app,
          jobTitle: job ? job.title : "Unknown Job",
          jobShortDescription: job ? job.shortDescription : "N/A"
        };
      });
      setLocalApplications(enhancedLocal);

      // 2. Fetch from Database
      const db = await getUserApplications();
      setDbApplications(db);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
                  <h3 className="text-2xl font-bold">{dbApplications.length + localApplications.length}</h3>
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
              <div className="flex justify-center py-8">
                <p>Loading your applications...</p>
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
                  {/* Combine and show unique applications */}
                  {dbApplications.length === 0 && localApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        You haven't applied for any jobs yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dbApplications.map((app) => (
                        <TableRow key={app._id}>
                          <TableCell className="font-mono text-xs">{app.jobId}</TableCell>
                          <TableCell className="font-medium">{app.jobTitle}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {app.jobShortDescription}
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
                      ))}
                      {localApplications.map((app, index) => {
                        // Avoid duplicates if already in DB
                        const inDb = dbApplications.some(dbApp => dbApp.jobId === app.jobId);
                        if (inDb) return null;
                        
                        return (
                          <TableRow key={`local-${index}`}>
                            <TableCell className="font-mono text-xs">{app.jobId}</TableCell>
                            <TableCell className="font-medium">{app.jobTitle}</TableCell>
                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                              {app.jobShortDescription}
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
                        );
                      })}
                    </>
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
