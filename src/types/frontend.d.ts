export interface ICandidateFrontend {
  _id: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  cvLink: string;
  choice1: string;
  department: string;
  status: 'Pending' | 'Pass' | 'Fail';
  generation: string;
  semester: string;
  appliedAt: string;
  major?: string; 
  dob?: string; 
  fbLink?: string;  
  plans_text?: string; 
}