from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    country: Optional[str] = None
    branchId: Optional[str] = None
    signupSecret: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

class CreateUserByAdmin(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    branchId: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

class GoogleAuthRequest(BaseModel):
    credential: str
    role: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    branchId: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyMfa(BaseModel):
    email: EmailStr
    code: str

class VerifyEnableMfa(BaseModel):
    code: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    oldPassword: Optional[str] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyForgotPasswordOTP(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str

    @field_validator("newPassword")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class BranchCreate(BaseModel):
    name: str
    city: str
    country: str
    area: Optional[str] = None

class SecondaryApplicant(BaseModel):
    secondaryRelationship: Optional[str] = None
    secondaryFirstName: Optional[str] = None
    secondaryLastName: Optional[str] = None
    secondaryDob: Optional[str] = None
    secondaryPassport: Optional[str] = None
    secondaryContactCode: Optional[str] = "+91"
    secondaryContactNumber: Optional[str] = None
    secondaryEmail: Optional[str] = None
    secondaryAddress: Optional[str] = None
    model_config = {"extra": "ignore"}

class LeadService(BaseModel):
    productLine: Optional[str] = None
    assignTo: Optional[str] = None
    leadStatus: Optional[str] = None
    leadQuality: Optional[str] = None
    source: Optional[str] = None
    comments: Optional[str] = None
    model_config = {"extra": "ignore"}

class LeadContactNumber(BaseModel):
    contactType: Optional[str] = "Personal"
    contactCode: Optional[str] = "+91"
    contactNumber: Optional[str] = None
    isPreferred: Optional[bool] = False
    model_config = {"extra": "ignore"}

class LeadEmailAddress(BaseModel):
    emailType: Optional[str] = "Personal"
    emailAddress: Optional[str] = None  # Using Optional[str] to prevent strict EmailStr errors on blank fields
    isPreferred: Optional[bool] = False
    model_config = {"extra": "ignore"}

class LeadAddress(BaseModel):
    addressType: Optional[str] = "Permanent"
    isDefault: Optional[bool] = False
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[str] = None
    model_config = {"extra": "ignore"}

class LeadCreate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "WEBSITE"
    leadStatus: str = "NEW"
    productLine: str = "UK"
    targetCountryPrimary: Optional[str] = None
    targetCountrySecondary: Optional[str] = None
    branchId: str
    ownerId: Optional[str] = None
    referringPartnerId: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    consentContact: bool = False
    
    # Personal info
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    gender: Optional[str] = None
    dateOfBirth: Optional[str] = None
    visaExpiryDate: Optional[str] = None
    maritalStatus: Optional[str] = None
    passportNumber: Optional[str] = None
    countryOfPassport: Optional[str] = None
    passportIssueDate: Optional[str] = None
    passportExpiryDate: Optional[str] = None
    passportIssuePlace: Optional[str] = None
    placeOfBirth: Optional[str] = None
    preferredVisa: Optional[str] = None
    currentVisaType: Optional[str] = None
    travelledCountries: Optional[str] = None
    visaRejected: Optional[str] = None
    
    # Contact info
    contactType: Optional[str] = None
    contactCode: Optional[str] = None
    emailType: Optional[str] = None
    addressType: Optional[str] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[str] = None

    phoneNumbers: Optional[List[LeadContactNumber]] = []
    emailAddresses: Optional[List[LeadEmailAddress]] = []
    addresses: Optional[List[LeadAddress]] = []
    
    # Social links
    facebookLink: Optional[str] = None
    twitterLink: Optional[str] = None
    instagramLink: Optional[str] = None
    youtubeLink: Optional[str] = None
    linkedinLink: Optional[str] = None
    
    # Employer info
    isEmployer: Optional[bool] = None
    companyName: Optional[str] = None
    companyRegNumber: Optional[str] = None
    companyRegDate: Optional[str] = None
    companyStatus: Optional[str] = None
    companyEmail: Optional[str] = None
    companyPhone: Optional[str] = None
    companyWebsite: Optional[str] = None
    companyAddress: Optional[str] = None
    primaryContactName: Optional[str] = None
    primaryContactEmail: Optional[str] = None
    primaryContactPhone: Optional[str] = None
    employerSecondaryContactName: Optional[str] = None
    employerSecondaryContactEmail: Optional[str] = None
    employerSecondaryContactPhone: Optional[str] = None

    secondaryRelationship: Optional[str] = None
    secondaryFirstName: Optional[str] = None
    secondaryLastName: Optional[str] = None
    secondaryDob: Optional[str] = None
    secondaryPassport: Optional[str] = None
    secondaryContactCode: Optional[str] = "+91"
    secondaryContactNumber: Optional[str] = None
    secondaryEmail: Optional[str] = None
    secondaryAddress: Optional[str] = None
    secondaryApplicants: Optional[List[SecondaryApplicant]] = []
    services: Optional[List[LeadService]] = []
    model_config = {"extra": "ignore"}

class LeadUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    leadStatus: Optional[str] = None
    productLine: Optional[str] = None
    targetCountryPrimary: Optional[str] = None
    targetCountrySecondary: Optional[str] = None
    branchId: Optional[str] = None
    ownerId: Optional[str] = None
    referringPartnerId: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    consentContact: Optional[bool] = None
    
    # Personal info
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    gender: Optional[str] = None
    dateOfBirth: Optional[str] = None
    visaExpiryDate: Optional[str] = None
    maritalStatus: Optional[str] = None
    passportNumber: Optional[str] = None
    countryOfPassport: Optional[str] = None
    passportIssueDate: Optional[str] = None
    passportExpiryDate: Optional[str] = None
    passportIssuePlace: Optional[str] = None
    placeOfBirth: Optional[str] = None
    preferredVisa: Optional[str] = None
    currentVisaType: Optional[str] = None
    travelledCountries: Optional[str] = None
    visaRejected: Optional[str] = None
    
    # Contact info
    contactType: Optional[str] = None
    contactCode: Optional[str] = None
    emailType: Optional[str] = None
    addressType: Optional[str] = None
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[str] = None

    phoneNumbers: Optional[List[LeadContactNumber]] = []
    emailAddresses: Optional[List[LeadEmailAddress]] = []
    addresses: Optional[List[LeadAddress]] = []
    
    # Social links
    facebookLink: Optional[str] = None
    twitterLink: Optional[str] = None
    instagramLink: Optional[str] = None
    youtubeLink: Optional[str] = None
    linkedinLink: Optional[str] = None
    
    # Employer info
    isEmployer: Optional[bool] = None
    companyName: Optional[str] = None
    companyRegNumber: Optional[str] = None
    companyRegDate: Optional[str] = None
    companyStatus: Optional[str] = None
    companyEmail: Optional[str] = None
    companyPhone: Optional[str] = None
    companyWebsite: Optional[str] = None
    companyAddress: Optional[str] = None
    primaryContactName: Optional[str] = None
    primaryContactEmail: Optional[str] = None
    primaryContactPhone: Optional[str] = None
    employerSecondaryContactName: Optional[str] = None
    employerSecondaryContactEmail: Optional[str] = None
    employerSecondaryContactPhone: Optional[str] = None

    secondaryRelationship: Optional[str] = None
    secondaryFirstName: Optional[str] = None
    secondaryLastName: Optional[str] = None
    secondaryDob: Optional[str] = None
    secondaryPassport: Optional[str] = None
    secondaryContactCode: Optional[str] = "+91"
    secondaryContactNumber: Optional[str] = None
    secondaryEmail: Optional[str] = None
    secondaryAddress: Optional[str] = None
    secondaryApplicants: Optional[List[SecondaryApplicant]] = []
    services: Optional[List[LeadService]] = []
    model_config = {"extra": "ignore"}

class DuplicateLeadRequest(BaseModel):
    productLine: str
    ownerId: str
    comments: Optional[str] = None
    followupType: Optional[str] = None
    sendEmail: bool = False
    sendSms: bool = False
    model_config = {"extra": "ignore"}


class LeadTransferRequest(BaseModel):
    sourceUserId: str
    destinationUserId: str
    destinationBranchId: str
    limit: Optional[int] = None
    transferReason: str

class CaseCreate(BaseModel):
    leadId: str
    productLine: Optional[str] = None
    targetCountry: Optional[str] = None
    visaType: Optional[str] = None
    stage: Optional[str] = "CASE_INITIATED"
    model_config = {"extra": "ignore"}

class TaskCreate(BaseModel):
    title: str
    dueDate: str
    assigneeId: str
    leadId: Optional[str] = None
    priority: str = "MEDIUM"
    model_config = {"extra": "ignore"}

class LeaveRequestCreate(BaseModel):
    startDate: str
    endDate: str
    reason: str
    model_config = {"extra": "ignore"}

class InvoiceLine(BaseModel):
    description: str
    quantity: int
    unitExGst: float
    gstRatePct: float

class InvoiceCreate(BaseModel):
    leadId: str
    dueDate: str
    currency: str = "INR"
    notes: Optional[str] = None
    lines: List[InvoiceLine]
    model_config = {"extra": "ignore"}

class PaymentCreate(BaseModel):
    invoiceId: str
    amount: float
    method: str
    reference: Optional[str] = None
    model_config = {"extra": "ignore"}

class AppointmentCreate(BaseModel):
    title: str
    appointmentDate: str          # "YYYY-MM-DD"
    appointmentTime: str          # "HH:MM"
    durationMins: int = 30
    type: str = "IN_PERSON"       # IN_PERSON | VIDEO_CALL | PHONE
    leadId: Optional[str] = None
    assigneeId: Optional[str] = None
    notes: Optional[str] = None
    model_config = {"extra": "ignore"}

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    appointmentDate: Optional[str] = None
    appointmentTime: Optional[str] = None
    durationMins: Optional[int] = None
    type: Optional[str] = None
    leadId: Optional[str] = None
    assigneeId: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
    model_config = {"extra": "ignore"}
