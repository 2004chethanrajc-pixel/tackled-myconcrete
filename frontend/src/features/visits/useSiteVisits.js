import { useState, useEffect } from 'react';
import { projectsApi } from '../projects/api';
import { visitsApi } from './api';

export const useSiteVisits = (userId) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSiteVisits = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all projects assigned to this site incharge
      const projectsResponse = await projectsApi.getAllProjects();
      
      if (!projectsResponse.success) {
        throw new Error('Failed to fetch projects');
      }

      const assignedProjects = projectsResponse.data.projects.filter(
        (project) => project.site_id === userId
      );

      // Then, fetch visits for each project
      const allVisits = [];
      for (const project of assignedProjects) {
        try {
          const visitsResponse = await visitsApi.getVisitsByProject(project.id);
          if (visitsResponse.success) {
            // Add project details to each visit and filter for this site incharge
            const projectVisits = visitsResponse.data.visits
              .filter((visit) => visit.site_id === userId && visit.status === 'scheduled')
              .map((visit) => ({
                ...visit,
                // Backend now provides these fields via JOIN
                project_name: visit.project_name || project.name,
                project_location: visit.project_location || project.location,
                customer_name: visit.customer_name,
                customer_phone: visit.customer_phone,
                customer_email: visit.customer_email,
              }));
            allVisits.push(...projectVisits);
          }
        } catch (err) {
          console.error(`Error fetching visits for project ${project.id}:`, err);
        }
      }

      // Sort by visit date and time (most recent first)
      allVisits.sort((a, b) => {
        const dateA = new Date(`${a.visit_date}T${a.visit_time}`);
        const dateB = new Date(`${b.visit_date}T${b.visit_time}`);
        return dateA - dateB;
      });

      setVisits(allVisits);
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch visits';
      setError(errorMessage);
      console.error('Error fetching site visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSiteVisits();
    }
  }, [userId]);

  return { visits, loading, error, refetch: fetchSiteVisits };
};
