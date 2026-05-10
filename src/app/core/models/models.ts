export interface User {
    id: number;
    username: string;
    email: string;
    roles: string[];
    token?: string;
    name?: string;
    contact?: string;
    district?: string;
    area?: string;
    department?: string;
    status?: string;
}

export interface Complaint {
    id: number;
    category: string;
    subCategory?: string;
    description: string;
    photoUrl: string;
    imageName?: string;
    location: string;
    district?: string;
    status: string;
    raisedDate: string;
    createdAt?: string;
    slaTimeline?: string;
    rejectionReason?: string;
    resolutionNotes?: string;
    reporter?: User;
    assignedSubAdmin?: User;
    priorityLevel?: string;
    slaAssigned?: boolean;
    assignedHeadName?: string;
    assignedHeadPhone?: string;
    assignedEmployees?: User[];
    completionProof?: string;
}
