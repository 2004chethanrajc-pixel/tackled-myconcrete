import { useState } from 'react';
import { quotationsApi } from './api';

export const useGenerateQuotation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuotation = async (quotationData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await quotationsApi.generateQuotation(quotationData);
      return response.data.quotation;
    } catch (err) {
      console.error('Generate quotation error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = 'Failed to generate quotation';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // If there are validation errors, append them
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage += ':\n' + err.response.data.errors.join('\n');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { generateQuotation, loading, error };
};

export const useProjectQuotations = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await quotationsApi.getQuotationsByProject(projectId);
      return response.data.quotations;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch quotations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { fetchQuotations, loading, error };
};


export const useApproveQuotation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const approveQuotation = async (quotationId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await quotationsApi.approveQuotation(quotationId);
      return response.data.quotation;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to approve quotation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { approveQuotation, loading, error };
};
