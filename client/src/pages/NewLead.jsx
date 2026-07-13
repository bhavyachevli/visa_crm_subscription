import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { User, Phone, Briefcase, Users, X, Plus, Trash2, Building2 } from 'lucide-react';
import { countries as defaultCountries, validatePhone } from '../lib/countries';
const parseErrorDetail = (detail) => {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => {
      const field = d.loc ? d.loc[d.loc.length - 1] : '';
      return `${field ? field + ': ' : ''}${d.msg || JSON.stringify(d)}`;
    }).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};
export default function NewLead() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [countriesList, setCountriesList] = useState(defaultCountries);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [isEmployer, setIsEmployer] = useState(false);

  const [addressStates, setAddressStates] = useState({});
  const [addressCities, setAddressCities] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [loadingCities, setLoadingCities] = useState({});

  const defaultService = {
    productLine: 'CANADA',
    assignTo: user?._id || '',
    leadStatus: 'NEW',
    leadQuality: '',
    source: 'WEBSITE',
    comments: '',
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    visaExpiryDate: '',
    maritalStatus: '',
    passportNumber: '',
    tags: '',
    countryOfPassport: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    passportIssuePlace: '',
    placeOfBirth: '',
    preferredVisa: '',
    currentVisaType: '',
    travelledCountries: '',
    visaRejected: 'No',

    phoneNumbers: [
      { contactType: 'Personal', contactCode: '+91', contactNumber: '', isPreferred: true }
    ],
    emailAddresses: [
      { emailType: 'Personal', emailAddress: '', isPreferred: true }
    ],
    addresses: [
      { addressType: 'Permanent', isDefault: true, addressLine1: '', addressLine2: '', country: '', state: '', city: '', zipcode: '' }
    ],
    facebookLink: '',
    twitterLink: '',
    instagramLink: '',
    youtubeLink: '',
    linkedinLink: '',

    branchId: user?.branchId && user.branchId !== 'None' ? user.branchId : '',
    services: [defaultService],

    secondaryRelationship: '',
    secondaryFirstName: '',
    secondaryLastName: '',
    secondaryDob: '',
    secondaryPassport: '',
    secondaryContactCode: '+91',
    secondaryContactNumber: '',
    secondaryEmail: '',
    secondaryAddress: '',
    secondaryApplicants: [],
    consentContact: true,

    // Employer Fields
    companyName: '',
    companyRegNumber: '',
    companyRegDate: '',
    companyStatus: 'Active',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyAddress: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    employerSecondaryContactName: '',
    employerSecondaryContactEmail: '',
    employerSecondaryContactPhone: '',
  });

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [branchRes, usersRes, countriesRes] = await Promise.all([
          axios.get('/api/meta/branches').catch(err => {
            console.error("Could not fetch branches", err);
            return { data: [] };
          }),
          axios.get('/api/users').catch(err => {
            console.error("Could not fetch users", err);
            return { data: [] };
          }),
          axios.get('/api/meta/countries').catch(err => {
            console.error("Could not fetch countries", err);
            return { data: [] };
          })
        ]);
        setBranches(branchRes.data || []);

        let fetchedUsers = usersRes.data || [];
        if (fetchedUsers.length === 0 && user) {
          fetchedUsers = [user];
        }
        setUsersList(fetchedUsers);
        if (countriesRes && countriesRes.data && countriesRes.data.length > 0) {
          setCountriesList(countriesRes.data);
        }
      } catch (err) {
        console.error("Could not fetch metadata", err);
      }
    };
    fetchMeta();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const addPhoneNumber = () => {
    setFormData({
      ...formData,
      phoneNumbers: [...formData.phoneNumbers, { contactType: 'Personal', contactCode: '+91', contactNumber: '', isPreferred: false }]
    });
  };

  const removePhoneNumber = (index) => {
    if (formData.phoneNumbers.length > 1) {
      const isWasPreferred = formData.phoneNumbers[index].isPreferred;
      const newPhoneNumbers = formData.phoneNumbers.filter((_, i) => i !== index);
      if (isWasPreferred && newPhoneNumbers.length > 0) {
        newPhoneNumbers[0].isPreferred = true;
      }
      setFormData({ ...formData, phoneNumbers: newPhoneNumbers });
    }
  };

  const handlePhoneNumberChange = (index, field, value) => {
    const newPhoneNumbers = formData.phoneNumbers.map((pn, i) => {
      if (i === index) {
        return { ...pn, [field]: value };
      }
      if (field === 'isPreferred' && value === true) {
        return { ...pn, isPreferred: false };
      }
      return pn;
    });
    setFormData({ ...formData, phoneNumbers: newPhoneNumbers });
    if (errors[`phoneNumbers_${index}_${field}`]) {
      setErrors({ ...errors, [`phoneNumbers_${index}_${field}`]: null });
    }
  };

  const addEmailAddress = () => {
    setFormData({
      ...formData,
      emailAddresses: [...formData.emailAddresses, { emailType: 'Personal', emailAddress: '', isPreferred: false }]
    });
  };

  const removeEmailAddress = (index) => {
    if (formData.emailAddresses.length > 1) {
      const isWasPreferred = formData.emailAddresses[index].isPreferred;
      const newEmailAddresses = formData.emailAddresses.filter((_, i) => i !== index);
      if (isWasPreferred && newEmailAddresses.length > 0) {
        newEmailAddresses[0].isPreferred = true;
      }
      setFormData({ ...formData, emailAddresses: newEmailAddresses });
    }
  };

  const handleEmailAddressChange = (index, field, value) => {
    const newEmails = formData.emailAddresses.map((em, i) => {
      if (i === index) {
        return { ...em, [field]: value };
      }
      if (field === 'isPreferred' && value === true) {
        return { ...em, isPreferred: false };
      }
      return em;
    });
    setFormData({ ...formData, emailAddresses: newEmails });
    if (errors[`emailAddresses_${index}_${field}`]) {
      setErrors({ ...errors, [`emailAddresses_${index}_${field}`]: null });
    }
  };

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { addressType: 'Permanent', isDefault: false, addressLine1: '', addressLine2: '', country: '', state: '', city: '', zipcode: '' }]
    });
  };

  const removeAddress = (index) => {
    if (formData.addresses.length > 1) {
      const isWasDefault = formData.addresses[index].isDefault;
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      if (isWasDefault && newAddresses.length > 0) {
        newAddresses[0].isDefault = true;
      }
      setFormData({ ...formData, addresses: newAddresses });

      // Shift states and cities cache index keys
      setAddressStates(prev => {
        const next = {};
        let newIdx = 0;
        for (let i = 0; i < formData.addresses.length; i++) {
          if (i !== index) {
            if (prev[i]) next[newIdx] = prev[i];
            newIdx++;
          }
        }
        return next;
      });
      setAddressCities(prev => {
        const next = {};
        let newIdx = 0;
        for (let i = 0; i < formData.addresses.length; i++) {
          if (i !== index) {
            if (prev[i]) next[newIdx] = prev[i];
            newIdx++;
          }
        }
        return next;
      });
    }
  };

  const handleAddressChange = async (index, field, value) => {
    let newAddresses = [...formData.addresses];

    if (field === 'country') {
      newAddresses[index] = {
        ...newAddresses[index],
        country: value,
        state: '',
        city: ''
      };
      setAddressCities(prev => ({ ...prev, [index]: [] }));

      if (value) {
        setLoadingStates(prev => ({ ...prev, [index]: true }));
        try {
          const res = await axios.post('/api/meta/states', { country: value });
          setAddressStates(prev => ({ ...prev, [index]: res.data.states || [] }));
        } catch (err) {
          console.error("Error fetching states", err);
          setAddressStates(prev => ({ ...prev, [index]: [] }));
        } finally {
          setLoadingStates(prev => ({ ...prev, [index]: false }));
        }
      } else {
        setAddressStates(prev => ({ ...prev, [index]: [] }));
      }
    } else if (field === 'state') {
      newAddresses[index] = {
        ...newAddresses[index],
        state: value,
        city: ''
      };

      if (value && newAddresses[index].country) {
        setLoadingCities(prev => ({ ...prev, [index]: true }));
        try {
          const res = await axios.post('/api/meta/cities', {
            country: newAddresses[index].country,
            state: value
          });
          setAddressCities(prev => ({ ...prev, [index]: res.data.cities || [] }));
        } catch (err) {
          console.error("Error fetching cities", err);
          setAddressCities(prev => ({ ...prev, [index]: [] }));
        } finally {
          setLoadingCities(prev => ({ ...prev, [index]: false }));
        }
      } else {
        setAddressCities(prev => ({ ...prev, [index]: [] }));
      }
    } else if (field === 'isDefault' && value === true) {
      newAddresses = newAddresses.map((addr, i) => {
        if (i === index) return { ...addr, isDefault: true };
        return { ...addr, isDefault: false };
      });
    } else {
      newAddresses[index] = {
        ...newAddresses[index],
        [field]: value
      };
    }

    setFormData({ ...formData, addresses: newAddresses });

    const newErrors = { ...errors };
    if (newErrors[`addresses_${index}_${field}`]) {
      newErrors[`addresses_${index}_${field}`] = null;
    }
    if (field === 'country') {
      newErrors[`addresses_${index}_state`] = null;
      newErrors[`addresses_${index}_city`] = null;
    } else if (field === 'state') {
      newErrors[`addresses_${index}_city`] = null;
    }
    setErrors(newErrors);
  };

  const handleServiceChange = (index, field, value) => {
    const newServices = [...formData.services];
    newServices[index][field] = value;
    setFormData({ ...formData, services: newServices });
    if (errors[`service_${index}_${field}`]) {
      setErrors({ ...errors, [`service_${index}_${field}`]: null });
    }
  };

  const addService = () => {
    setFormData({ ...formData, services: [...formData.services, { ...defaultService }] });
  };

  const removeService = (index) => {
    if (formData.services.length > 1) {
      const newServices = formData.services.filter((_, i) => i !== index);
      setFormData({ ...formData, services: newServices });
    }
  };

  const handleSecondaryApplicantChange = (index, field, value) => {
    const newApplicants = [...formData.secondaryApplicants];
    newApplicants[index][field] = value;
    setFormData({ ...formData, secondaryApplicants: newApplicants });
  };

  const addSecondaryApplicant = () => {
    setFormData({
      ...formData,
      secondaryApplicants: [
        ...formData.secondaryApplicants,
        {
          secondaryRelationship: '',
          secondaryFirstName: '',
          secondaryLastName: '',
          secondaryDob: '',
          secondaryPassport: '',
          secondaryContactCode: '+91',
          secondaryContactNumber: '',
          secondaryEmail: '',
          secondaryAddress: ''
        }
      ]
    });
  };

  const removeSecondaryApplicant = (index) => {
    const newApplicants = formData.secondaryApplicants.filter((_, i) => i !== index);
    setFormData({ ...formData, secondaryApplicants: newApplicants });
  };

  const validateTab = (tabIndex) => {
    const newErrors = {};

    if (!isEmployer) {
      if (tabIndex === 0) {
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First Name is required';
        } else if (!/^[A-Za-z\s]+$/.test(formData.firstName.trim())) {
          newErrors.firstName = 'First Name must contain only letters';
        }
        if (!formData.gender) newErrors.gender = 'Gender is required';

        if (formData.passportNumber) {
          if (!/^[A-Z0-9]{3,15}$/i.test(formData.passportNumber.trim())) {
            newErrors.passportNumber = 'Passport must be 3-15 alphanumeric characters';
          }
          if (formData.passportExpiryDate) {
            if (new Date(formData.passportExpiryDate) <= new Date()) {
              newErrors.passportExpiryDate = 'Expiry date must be in the future';
            }
          }
        }
      } else if (tabIndex === 1) {
        if (!formData.phoneNumbers || formData.phoneNumbers.length === 0) {
          newErrors.phoneNumbers = 'At least one contact number is required';
        } else {
          formData.phoneNumbers.forEach((pn, index) => {
            const check = validatePhone(pn.contactCode, pn.contactNumber);
            if (!check.isValid) {
              newErrors[`phoneNumbers_${index}_contactNumber`] = check.error;
            }
          });
        }
        if (!formData.emailAddresses || formData.emailAddresses.length === 0) {
          newErrors.emailAddresses = 'At least one email address is required';
        } else {
          formData.emailAddresses.forEach((em, index) => {
            if (!em.emailAddress.trim()) {
              newErrors[`emailAddresses_${index}_emailAddress`] = 'Required';
            } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(em.emailAddress.trim())) {
              newErrors[`emailAddresses_${index}_emailAddress`] = 'Invalid format';
            }
          });
        }
        if (formData.addresses) {
          formData.addresses.forEach((addr, index) => {
            if (addr.addressLine1 || addr.city || addr.zipcode || addr.state || addr.country) {
              if (!addr.addressLine1.trim()) {
                newErrors[`addresses_${index}_addressLine1`] = 'Area is required';
              }
              if (!addr.country) {
                newErrors[`addresses_${index}_country`] = 'Country is required';
              }
              if (addressStates[index] && addressStates[index].length > 0 && !addr.state) {
                newErrors[`addresses_${index}_state`] = 'State is required';
              }
              if (addressCities[index] && addressCities[index].length > 0 && !addr.city) {
                newErrors[`addresses_${index}_city`] = 'City is required';
              }
            }
          });
        }
      } else if (tabIndex === 2) {
        if (!formData.branchId) newErrors.branchId = 'Branch is required';
        formData.services.forEach((srv, idx) => {
          if (!srv.productLine) newErrors[`service_${idx}_productLine`] = 'Required';
          if (!srv.assignTo) newErrors[`service_${idx}_assignTo`] = 'Required';
          if (!srv.leadStatus) newErrors[`service_${idx}_leadStatus`] = 'Required';
          if (!srv.leadQuality) newErrors[`service_${idx}_leadQuality`] = 'Required';
          if (!srv.source) newErrors[`service_${idx}_source`] = 'Required';
        });
      } else if (tabIndex === 3) {
        formData.secondaryApplicants.forEach((sa, index) => {
          if (sa.secondaryContactNumber && sa.secondaryContactNumber.trim()) {
            const check = validatePhone(sa.secondaryContactCode, sa.secondaryContactNumber);
            if (!check.isValid) {
              newErrors[`secondary_${index}_secondaryContactNumber`] = check.error;
            }
          }
          if (sa.secondaryEmail && sa.secondaryEmail.trim()) {
            if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(sa.secondaryEmail.trim())) {
              newErrors[`secondary_${index}_secondaryEmail`] = 'Invalid format';
            }
          }
        });
      }
    } else {
      if (tabIndex === 0) {
        if (!formData.companyName.trim()) newErrors.companyName = 'Company Name is required';
        if (!formData.companyEmail.trim()) newErrors.companyEmail = 'Company Email is required';
      } else if (tabIndex === 1) {
        if (!formData.primaryContactName.trim()) newErrors.primaryContactName = 'Primary Contact Name is required';
        if (!formData.primaryContactPhone.trim()) newErrors.primaryContactPhone = 'Primary Contact Phone is required';
      } else if (tabIndex === 2) {
        if (!formData.branchId) newErrors.branchId = 'Branch is required';
        formData.services.forEach((srv, idx) => {
          if (!srv.productLine) newErrors[`service_${idx}_productLine`] = 'Required';
          if (!srv.assignTo) newErrors[`service_${idx}_assignTo`] = 'Required';
          if (!srv.leadStatus) newErrors[`service_${idx}_leadStatus`] = 'Required';
          if (!srv.leadQuality) newErrors[`service_${idx}_leadQuality`] = 'Required';
          if (!srv.source) newErrors[`service_${idx}_source`] = 'Required';
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAndNext = () => {
    if (validateTab(activeTab)) {
      setGlobalError('');
      setActiveTab(activeTab + 1);
    } else {
      setGlobalError('Please fill all required fields correctly.');
    }
  };

  const handleSave = async () => {
    // Validate all tabs up to current
    for (let i = 0; i <= activeTab; i++) {
      if (!validateTab(i)) {
        setActiveTab(i);
        setGlobalError('Please fill all required fields correctly.');
        return;
      }
    }

    setLoading(true);
    setGlobalError('');

    // The primary service fields should map to the root of the Lead object for backward compatibility
    const primaryService = formData.services[0];

    let payload = {
      ...formData,
      isEmployer,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      productLine: primaryService.productLine,
      assignTo: primaryService.assignTo,
      ownerId: primaryService.assignTo,
      leadStatus: primaryService.leadStatus,
      leadQuality: primaryService.leadQuality,
      source: primaryService.source,
      notes: primaryService.comments,
    };

    if (isEmployer) {
      payload.fullName = formData.companyName.trim();
      payload.email = formData.companyEmail.trim();
      payload.phone = formData.companyPhone.trim();
    } else {
      payload.fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const prefPhone = formData.phoneNumbers.find(p => p.isPreferred) || formData.phoneNumbers[0];
      payload.phone = prefPhone && prefPhone.contactNumber ? `${prefPhone.contactCode} ${prefPhone.contactNumber}`.trim() : '';
      const prefEmail = formData.emailAddresses.find(e => e.isPreferred) || formData.emailAddresses[0];
      payload.email = prefEmail ? prefEmail.emailAddress.trim() : '';
    }

    try {
      const res = await axios.post('/api/leads', payload);
      navigate(`/leads/${res.data.id}`);
    } catch (err) {
      setGlobalError(parseErrorDetail(err.response?.data?.detail) || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const individualTabs = [
    { name: 'Personal Info', icon: User },
    { name: 'Contact Info', icon: Phone },
    { name: 'Service Info', icon: Briefcase },
    { name: 'Secondary Applicant', icon: Users },
  ];

  const employerTabs = [
    { name: 'Company Info', icon: Building2 },
    { name: 'Contact Info', icon: Phone },
    { name: 'Service Info', icon: Briefcase },
  ];

  const tabs = isEmployer ? employerTabs : individualTabs;

  const getInputClass = (errorKey) =>
    `mt-1 block w-full rounded-lg border py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white ${errors[errorKey] ? 'border-red-500 bg-red-50' : 'border-slate-300'
    }`;
  const labelClass = "block text-xs font-semibold text-slate-500 mb-0.5";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-sky-900">NEW LEAD</h2>

        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={isEmployer} onChange={(e) => {
                setIsEmployer(e.target.checked);
                setActiveTab(0);
                setErrors({});
                setGlobalError('');
              }} />
              <div className={`block w-10 h-6 rounded-full transition-colors ${isEmployer ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isEmployer ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <span className="text-sm font-medium text-slate-700">Create Lead For Employer</span>
          </label>

          <button onClick={() => navigate('/leads')} className="text-red-400 hover:text-red-600">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx < activeTab || validateTab(activeTab)) {
                  setGlobalError('');
                  setActiveTab(idx);
                } else {
                  setGlobalError('Please fill all required fields correctly before switching tabs.');
                }
              }}
              className={`flex items-center px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {globalError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
          {globalError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6 md:p-8">
        {/* EMPLOYER TAB 0: Company Info */}
        {isEmployer && activeTab === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>*Company Name</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={getInputClass('companyName')} />
                {errors.companyName && <span className="text-xs text-red-500 mt-1">{errors.companyName}</span>}
              </div>
              <div>
                <label className={labelClass}>Company Registration Number</label>
                <input type="text" name="companyRegNumber" value={formData.companyRegNumber} onChange={handleChange} className={getInputClass('companyRegNumber')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Registration Date</label>
                <input type="date" name="companyRegDate" value={formData.companyRegDate} onChange={handleChange} className={getInputClass('companyRegDate')} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select name="companyStatus" value={formData.companyStatus} onChange={handleChange} className={getInputClass('companyStatus')}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>*Company Email</label>
                <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} className={getInputClass('companyEmail')} />
                {errors.companyEmail && <span className="text-xs text-red-500 mt-1">{errors.companyEmail}</span>}
              </div>
              <div>
                <label className={labelClass}>Company Phone</label>
                <input type="text" name="companyPhone" value={formData.companyPhone} onChange={handleChange} className={getInputClass('companyPhone')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Company Website</label>
              <input type="url" name="companyWebsite" placeholder="https://" value={formData.companyWebsite} onChange={handleChange} className={getInputClass('companyWebsite')} />
            </div>

            <div>
              <label className={labelClass}>Company Address</label>
              <textarea name="companyAddress" value={formData.companyAddress} onChange={handleChange} rows={2} className={getInputClass('companyAddress')}></textarea>
            </div>

            <div>
              <label className={labelClass}>Tags/Label</label>
              <input type="text" name="tags" placeholder="e.g. VIP, Urgent" value={formData.tags} onChange={handleChange} className={getInputClass('tags')} />
            </div>
          </div>
        )}

        {/* EMPLOYER TAB 1: Contact Info */}
        {isEmployer && activeTab === 1 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-sky-800 uppercase tracking-wide border-b pb-2">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>*Name</label>
                <input type="text" name="primaryContactName" value={formData.primaryContactName} onChange={handleChange} className={getInputClass('primaryContactName')} />
                {errors.primaryContactName && <span className="text-xs text-red-500 mt-1">{errors.primaryContactName}</span>}
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" name="primaryContactEmail" value={formData.primaryContactEmail} onChange={handleChange} className={getInputClass('primaryContactEmail')} />
              </div>
              <div>
                <label className={labelClass}>*Phone Number</label>
                <input type="text" name="primaryContactPhone" value={formData.primaryContactPhone} onChange={handleChange} className={getInputClass('primaryContactPhone')} />
                {errors.primaryContactPhone && <span className="text-xs text-red-500 mt-1">{errors.primaryContactPhone}</span>}
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b pb-2 mt-6">Secondary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" name="employerSecondaryContactName" value={formData.employerSecondaryContactName} onChange={handleChange} className={getInputClass('employerSecondaryContactName')} />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" name="employerSecondaryContactEmail" value={formData.employerSecondaryContactEmail} onChange={handleChange} className={getInputClass('employerSecondaryContactEmail')} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="text" name="employerSecondaryContactPhone" value={formData.employerSecondaryContactPhone} onChange={handleChange} className={getInputClass('employerSecondaryContactPhone')} />
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL TAB 0: Personal Info */}
        {!isEmployer && activeTab === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>*First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={getInputClass('firstName')} />
                {errors.firstName && <span className="text-xs text-red-500 mt-1">{errors.firstName}</span>}
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={getInputClass('lastName')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>*Gender</label>
              <div className="flex space-x-6 mt-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <label key={g} className="flex items-center text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} className="mr-2 text-sky-600" />
                    {g}
                  </label>
                ))}
              </div>
              {errors.gender && <span className="text-xs text-red-500 mt-1 block">{errors.gender}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={getInputClass('dateOfBirth')} />
              </div>

            </div>

            <div>
              <label className={labelClass}>Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className={getInputClass('maritalStatus')}>
                <option value="">Select Marital Status</option>
                <option value="Never Married">Never Married</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Passport Number</label>
                <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className={getInputClass('passportNumber')} />
                {errors.passportNumber && <span className="text-xs text-red-500 mt-1">{errors.passportNumber}</span>}
              </div>
              <div>
                <label className={labelClass}>Tags/Label</label>
                <input type="text" name="tags" placeholder="e.g. VIP, Urgent" value={formData.tags} onChange={handleChange} className={getInputClass('tags')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Country of Passport</label>
                <select name="countryOfPassport" value={formData.countryOfPassport} onChange={handleChange} className={getInputClass('countryOfPassport')}>
                  <option value="">Select Country</option>
                  {countriesList.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Passport Issue Date</label>
                <input type="date" name="passportIssueDate" value={formData.passportIssueDate} onChange={handleChange} className={getInputClass('passportIssueDate')} />
              </div>
              <div>
                <label className={labelClass}>Passport Expiry Date</label>
                <input type="date" name="passportExpiryDate" value={formData.passportExpiryDate} onChange={handleChange} className={getInputClass('passportExpiryDate')} />
                {errors.passportExpiryDate && <span className="text-xs text-red-500 mt-1">{errors.passportExpiryDate}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Passport Issue Place</label>
                <input type="text" name="passportIssuePlace" value={formData.passportIssuePlace} onChange={handleChange} className={getInputClass('passportIssuePlace')} />
              </div>
              <div>
                <label className={labelClass}>Place of Birth</label>
                <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className={getInputClass('placeOfBirth')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Preferred Visa</label>
                <select name="preferredVisa" value={formData.preferredVisa} onChange={handleChange} className={getInputClass('preferredVisa')}>
                  <option value="">Select Preferred Visa(s)</option>
                  <option value="Student">Student</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Work Permit">Work Permit</option>
                  <option value="PR">PR</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Visa type you currently hold</label>
                <input type="text" name="currentVisaType" value={formData.currentVisaType} onChange={handleChange} className={getInputClass('currentVisaType')} />
              </div>
              <div>
                <label className={labelClass}>Visa Expiry Date which you currently hold</label>
                <input type="date" name="visaExpiryDate" value={formData.visaExpiryDate} onChange={handleChange} className={getInputClass('visaExpiryDate')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Which country have you moved/travelled to?</label>
              <select name="travelledCountries" value={formData.travelledCountries} onChange={handleChange} className={getInputClass('travelledCountries')}>
                <option value="">Select Country(s)</option>
                {countriesList.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Have your visa been rejected by any country previously?</label>
              <div className="flex space-x-6 mt-2">
                {['Yes', 'No', 'Not Sure'].map(v => (
                  <label key={v} className="flex items-center text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="visaRejected" value={v} checked={formData.visaRejected === v} onChange={handleChange} className="mr-2" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL TAB 1: Contact Info */}
        {!isEmployer && activeTab === 1 && (
          <div className="">
            <div className="lg:col-span-2 space-y-8">
              {/* SECTION: Contact Numbers */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-indigo-500" /> Contact Numbers
                  </h4>
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="flex items-center text-xs font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100/85 py-1.5 px-3 rounded-lg border border-indigo-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Number
                  </button>
                </div>
                {errors.phoneNumbers && (
                  <span className="text-xs text-red-500 block">{errors.phoneNumbers}</span>
                )}

                <div className="space-y-3">
                  {formData.phoneNumbers.map((pn, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col md:flex-row gap-3 items-start md:items-center relative transition-all duration-255 ${pn.isPreferred ? 'border-indigo-400 ring-2 ring-indigo-50 bg-indigo-50/5' : 'border-slate-200 hover:border-slate-350'}`}>
                      <div className="w-full md:w-32">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type</label>
                        <select
                          value={pn.contactType}
                          onChange={(e) => handlePhoneNumberChange(idx, 'contactType', e.target.value)}
                          className="mt-0.5 block w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Work">Work</option>
                          <option value="Home">Home</option>
                          <option value="Mobile">Mobile</option>
                          <option value="Office">Office</option>
                        </select>
                      </div>

                      <div className="w-24 shrink-0">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Code</label>
                        <select
                          value={pn.contactCode}
                          onChange={(e) => handlePhoneNumberChange(idx, 'contactCode', e.target.value)}
                          className="mt-0.5 block w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        >
                          {countriesList.map(c => (
                            <option key={`${c.code}-${c.dial_code}`} value={c.dial_code}>
                              {c.dial_code} ({c.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Number</label>
                        <input
                          type="text"
                          value={pn.contactNumber}
                          onChange={(e) => handlePhoneNumberChange(idx, 'contactNumber', e.target.value)}
                          className={`mt-0.5 block w-full rounded-lg border py-1.5 px-3 text-xs bg-white ${errors[`phoneNumbers_${idx}_contactNumber`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                          placeholder="e.g. 9876543210"
                        />
                        {errors[`phoneNumbers_${idx}_contactNumber`] && (
                          <span className="text-[10px] text-red-500 mt-0.5 block">
                            {errors[`phoneNumbers_${idx}_contactNumber`]}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 self-end md:self-center mt-2 md:mt-4 shrink-0">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-650">
                          <input
                            type="checkbox"
                            checked={pn.isPreferred}
                            onChange={(e) => handlePhoneNumberChange(idx, 'isPreferred', e.target.checked)}
                            className="rounded text-indigo-650 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                          />
                          <span>Preferred</span>
                        </label>

                        {formData.phoneNumbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhoneNumber(idx)}
                            className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete contact number"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Email Addresses */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center">
                    <Users className="w-4 h-4 mr-2 text-indigo-500" /> Email Addresses
                  </h4>
                  <button
                    type="button"
                    onClick={addEmailAddress}
                    className="flex items-center text-xs font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100/85 py-1.5 px-3 rounded-lg border border-indigo-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Email
                  </button>
                </div>
                {errors.emailAddresses && (
                  <span className="text-xs text-red-500 block">{errors.emailAddresses}</span>
                )}

                <div className="space-y-3">
                  {formData.emailAddresses.map((em, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col md:flex-row gap-3 items-start md:items-center relative transition-all duration-255 ${em.isPreferred ? 'border-indigo-400 ring-2 ring-indigo-50 bg-indigo-50/5' : 'border-slate-200 hover:border-slate-350'}`}>
                      <div className="w-full md:w-32">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type</label>
                        <select
                          value={em.emailType}
                          onChange={(e) => handleEmailAddressChange(idx, 'emailType', e.target.value)}
                          className="mt-0.5 block w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Work">Work</option>
                          <option value="Office">Office</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</label>
                        <input
                          type="email"
                          value={em.emailAddress}
                          onChange={(e) => handleEmailAddressChange(idx, 'emailAddress', e.target.value)}
                          className={`mt-0.5 block w-full rounded-lg border py-1.5 px-3 text-xs bg-white ${errors[`emailAddresses_${idx}_emailAddress`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                          placeholder="e.g. name@example.com"
                        />
                        {errors[`emailAddresses_${idx}_emailAddress`] && (
                          <span className="text-[10px] text-red-500 mt-0.5 block">
                            {errors[`emailAddresses_${idx}_emailAddress`]}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 self-end md:self-center mt-2 md:mt-4 shrink-0">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-650">
                          <input
                            type="checkbox"
                            checked={em.isPreferred}
                            onChange={(e) => handleEmailAddressChange(idx, 'isPreferred', e.target.checked)}
                            className="rounded text-indigo-650 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                          />
                          <span>Preferred</span>
                        </label>

                        {formData.emailAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailAddress(idx)}
                            className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete email address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Physical Addresses */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <h4 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-indigo-500" /> Addresses
                  </h4>
                  <button
                    type="button"
                    onClick={addAddress}
                    className="flex items-center text-xs font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100/85 py-1.5 px-3 rounded-lg border border-indigo-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Address
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.addresses.map((addr, idx) => (
                    <div key={idx} className={`p-5 rounded-xl border bg-white shadow-sm space-y-4 relative transition-all duration-255 ${addr.isDefault ? 'border-indigo-400 ring-2 ring-indigo-50 bg-indigo-50/5' : 'border-slate-200 hover:border-slate-350'}`}>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Address Block #{idx + 1}</span>
                          <select
                            value={addr.addressType}
                            onChange={(e) => handleAddressChange(idx, 'addressType', e.target.value)}
                            className="py-0.5 px-2 text-[10px] font-bold uppercase rounded border border-slate-200 bg-white text-slate-655 focus:ring-indigo-500"
                          >
                            <option value="Permanent">Permanent</option>
                            <option value="Current">Current</option>
                            <option value="Office">Office</option>
                            <option value="Home">Home</option>
                            <option value="Mailing">Mailing</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-650">
                            <input
                              type="checkbox"
                              checked={addr.isDefault}
                              onChange={(e) => handleAddressChange(idx, 'isDefault', e.target.checked)}
                              className="rounded text-indigo-650 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                            />
                            <span>Default Billing</span>
                          </label>

                          {formData.addresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAddress(idx)}
                              className="p-1 text-red-400 hover:text-red-650 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Country Selector */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Country</label>
                            <select
                              value={addr.country}
                              onChange={(e) => handleAddressChange(idx, 'country', e.target.value)}
                              className={`mt-0.5 block w-full rounded-lg border py-1.5 px-2.5 text-xs bg-white ${errors[`addresses_${idx}_country`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                            >
                              <option value="">Select Country</option>
                              {countriesList.map(c => (
                                <option key={c.code} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                            {errors[`addresses_${idx}_country`] && (
                              <span className="text-[10px] text-red-500 mt-0.5 block">{errors[`addresses_${idx}_country`]}</span>
                            )}
                          </div>

                          {/* State Selector */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">State</label>
                            <select
                              value={addr.state}
                              onChange={(e) => handleAddressChange(idx, 'state', e.target.value)}
                              disabled={!addr.country || loadingStates[idx]}
                              className={`mt-0.5 block w-full rounded-lg border py-1.5 px-2.5 text-xs bg-white ${errors[`addresses_${idx}_state`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                            >
                              <option value="">{loadingStates[idx] ? 'Loading states...' : 'Select State'}</option>
                              {(addressStates[idx] || []).map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                            {errors[`addresses_${idx}_state`] && (
                              <span className="text-[10px] text-red-500 mt-0.5 block">{errors[`addresses_${idx}_state`]}</span>
                            )}
                          </div>

                          {/* City/Suburb Selector */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">City</label>
                            <select
                              value={addr.city}
                              onChange={(e) => handleAddressChange(idx, 'city', e.target.value)}
                              disabled={!addr.state || loadingCities[idx]}
                              className={`mt-0.5 block w-full rounded-lg border py-1.5 px-2.5 text-xs bg-white ${errors[`addresses_${idx}_city`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                            >
                              <option value="">{loadingCities[idx] ? 'Loading cities...' : 'Select City'}</option>
                              {(addressCities[idx] || []).map(ct => (
                                <option key={ct} value={ct}>{ct}</option>
                              ))}
                            </select>
                            {errors[`addresses_${idx}_city`] && (
                              <span className="text-[10px] text-red-500 mt-0.5 block">{errors[`addresses_${idx}_city`]}</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Area / Address Line 1 */}
                          <div className="md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Area / Street Address</label>
                            <input
                              type="text"
                              placeholder="Area / Street Address"
                              value={addr.addressLine1}
                              onChange={(e) => handleAddressChange(idx, 'addressLine1', e.target.value)}
                              className={`mt-0.5 block w-full rounded-lg border py-1.5 px-3 text-xs bg-white ${errors[`addresses_${idx}_addressLine1`] ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'}`}
                            />
                            {errors[`addresses_${idx}_addressLine1`] && (
                              <span className="text-[10px] text-red-500 mt-0.5 block">{errors[`addresses_${idx}_addressLine1`]}</span>
                            )}
                          </div>

                          {/* Zipcode/Pincode */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Zipcode/Pincode</label>
                            <input
                              type="text"
                              placeholder="Zipcode/Pincode"
                              value={addr.zipcode}
                              onChange={(e) => handleAddressChange(idx, 'zipcode', e.target.value)}
                              className="mt-0.5 block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                            />
                          </div>
                        </div>

                        {/* Optional Address Line 2 */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Address Line 2 (Optional)</label>
                          <input
                            type="text"
                            placeholder="Apartment, suite, unit, building, floor, etc."
                            value={addr.addressLine2}
                            onChange={(e) => handleAddressChange(idx, 'addressLine2', e.target.value)}
                            className="mt-0.5 block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Social Links */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                <h4 className="text-sm font-bold text-sky-900 uppercase tracking-wider">Social Media Links</h4>
                <div className="space-y-3">
                  <input type="text" name="facebookLink" placeholder="Facebook Link" value={formData.facebookLink} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white" />
                  <input type="text" name="twitterLink" placeholder="Twitter Link" value={formData.twitterLink} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white" />
                  <input type="text" name="instagramLink" placeholder="Instagram Link" value={formData.instagramLink} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white" />
                  <input type="text" name="youtubeLink" placeholder="Youtube Link" value={formData.youtubeLink} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white" />
                  <input type="text" name="linkedinLink" placeholder="LinkedIn Link" value={formData.linkedinLink} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Address Preview Panel */}
            {/* <div className="lg:col-span-1">
              {(() => {
                const activeAddress = formData.addresses.find(a => a.isDefault) || formData.addresses[0];
                return activeAddress ? (
                  <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl sticky top-6 border border-indigo-800">
                    <div className="flex items-center justify-between mb-4 border-b border-indigo-800 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-300 font-mono">Invoice Mailing Label</h4>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                        {activeAddress.addressType || 'Permanent'}
                      </span>
                    </div>
                    
                    <div className="space-y-3 font-sans">
                      <div className="border-l-4 border-emerald-400 pl-3 py-1 space-y-1">
                        <p className="font-semibold text-sm tracking-wide text-white">
                          {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim().toUpperCase() : 'APPLICANT NAME'}
                        </p>
                        <p className="text-xs text-indigo-100/90 leading-relaxed font-mono">
                          {activeAddress.addressLine1 || <span className="text-indigo-400 italic text-[11px]">No Address Line 1</span>}
                        </p>
                        {activeAddress.addressLine2 && (
                          <p className="text-xs text-indigo-100/90 leading-relaxed font-mono">{activeAddress.addressLine2}</p>
                        )}
                        <p className="text-xs text-indigo-100/90 leading-relaxed font-mono">
                          {[activeAddress.city, activeAddress.state, activeAddress.zipcode].filter(Boolean).join(', ') || <span className="text-indigo-400 italic text-[11px]">City, State, Zipcode</span>}
                        </p>
                        <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider pt-1 font-mono">
                          {activeAddress.country || <span className="text-indigo-400 italic text-[11px]">Country</span>}
                        </p>
                      </div>

                      <div className="bg-indigo-950/70 border border-indigo-850/60 rounded-xl p-3.5 mt-4 space-y-2">
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">Contact Info Summary</div>
                        <div className="text-xs space-y-1.5 text-indigo-200">
                          {formData.phoneNumbers.map((pn, i) => (
                            <div key={i} className={`flex justify-between items-center text-[11px] ${pn.isPreferred ? 'text-white font-semibold font-sans' : 'text-indigo-200/70'}`}>
                              <span>{pn.contactType} ({pn.contactCode}):</span>
                              <span>{pn.contactNumber || '—'} {pn.isPreferred && '⭐'}</span>
                            </div>
                          ))}
                          <hr className="border-indigo-900 my-1.5" />
                          {formData.emailAddresses.map((em, i) => (
                            <div key={i} className={`flex justify-between items-center text-[11px] ${em.isPreferred ? 'text-white font-semibold font-sans' : 'text-indigo-200/70'}`}>
                              <span>{em.emailType}:</span>
                              <span className="truncate max-w-44">{em.emailAddress || '—'} {em.isPreferred && '⭐'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-2 text-[10px] text-indigo-300/60 leading-relaxed italic border-t border-indigo-900">
                        * This layout displays how details will align on invoice headers and billing documents.
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div> */}
          </div>
        )}

        {/* COMMON TAB 2: Service Info */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <label className={labelClass}>*Branch</label>
              <select name="branchId" value={formData.branchId} onChange={handleChange} className={getInputClass('branchId')}>
                <option value="" disabled>Select a branch</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {errors.branchId && <span className="text-xs text-red-500 mt-1">{errors.branchId}</span>}
            </div>

            {formData.services.map((srv, idx) => (
              <div key={idx} className="relative bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
                <div className="absolute top-4 right-4 flex space-x-2">
                  {formData.services.length > 1 && (
                    <button type="button" onClick={() => removeService(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {idx === formData.services.length - 1 && (
                    <button type="button" onClick={addService} className="p-1.5 text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg flex items-center shadow-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="pr-16 space-y-4">
                  <div>
                    <label className={labelClass}>*Service</label>
                    <select value={srv.productLine} onChange={(e) => handleServiceChange(idx, 'productLine', e.target.value)} className={getInputClass(`service_${idx}_productLine`)}>
                      <option value="">Select Service</option>
                      <option value="CANADA">Application + Student Visa - (Canada)</option>
                      <option value="USA">Application + Student Visa - (USA)</option>
                      <option value="UK">Application + Student Visa - (UK)</option>
                      <option value="EUROPE">Application + Student Visa - (Europe)</option>
                      <option value="AUSTRALIA">Application + Student Visa - (Australia)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Assign To</label>
                    <select value={srv.assignTo} onChange={(e) => handleServiceChange(idx, 'assignTo', e.target.value)} className={getInputClass(`service_${idx}_assignTo`)}>
                      <option value="">Select User</option>
                      {usersList.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Status</label>
                    <select value={srv.leadStatus} onChange={(e) => handleServiceChange(idx, 'leadStatus', e.target.value)} className={getInputClass(`service_${idx}_leadStatus`)}>
                      <option value="">Select Status</option>
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Lead Quality</label>
                    <select value={srv.leadQuality} onChange={(e) => handleServiceChange(idx, 'leadQuality', e.target.value)} className={getInputClass(`service_${idx}_leadQuality`)}>
                      <option value="">Select Quality</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Lead Source</label>
                    <select value={srv.source} onChange={(e) => handleServiceChange(idx, 'source', e.target.value)} className={getInputClass(`service_${idx}_source`)}>
                      <option value="">Select Source</option>
                      <option value="WEBSITE">Website</option>
                      <option value="WALK_IN">Walk-in</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="PARTNER">Partner</option>
                      <option value="SOCIAL">Social Media</option>
                      <option value="EVENT">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Comments / Notes</label>
                    <textarea value={srv.comments} onChange={(e) => handleServiceChange(idx, 'comments', e.target.value)} rows={3} className={getInputClass(`service_${idx}_comments`)}></textarea>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INDIVIDUAL TAB 3: Secondary Applicant */}
        {!isEmployer && activeTab === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4 border-slate-200">
              <h3 className="text-sm font-bold text-sky-900 uppercase tracking-wide">Secondary Applicants / Dependents</h3>
              <button
                type="button"
                onClick={addSecondaryApplicant}
                className="flex items-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-2 px-4 rounded-lg shadow transition-all duration-150"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Secondary Applicant
              </button>
            </div>

            {formData.secondaryApplicants.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
                <Users className="w-8 h-8 text-slate-300" />
                <div>
                  <p className="font-semibold text-slate-500">No secondary applicants added yet.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Click the button above to add family members or dependents.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.secondaryApplicants.map((applicant, idx) => (
                  <div key={idx} className="relative bg-slate-50/40 border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all">
                    <div className="absolute top-5 right-5">
                      <button
                        type="button"
                        onClick={() => removeSecondaryApplicant(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 bg-white shadow-sm transition-all"
                        title="Remove applicant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-5 flex items-center">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-650 flex items-center justify-center mr-2 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      Applicant #{idx + 1} {applicant.secondaryRelationship ? `(${applicant.secondaryRelationship})` : ''}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Relationship</label>
                        <select
                          value={applicant.secondaryRelationship}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryRelationship', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryRelationship`)}
                        >
                          <option value="">Select Relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="De facto">De facto</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>First Name</label>
                        <input
                          type="text"
                          value={applicant.secondaryFirstName}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryFirstName', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryFirstName`)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Last Name</label>
                        <input
                          type="text"
                          value={applicant.secondaryLastName}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryLastName', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryLastName`)}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Date of Birth</label>
                        <input
                          type="date"
                          value={applicant.secondaryDob}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryDob', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryDob`)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Passport Number</label>
                        <input
                          type="text"
                          value={applicant.secondaryPassport}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryPassport', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryPassport`)}
                        />
                      </div>

                      <div className="md:col-span-2 flex gap-3">
                        <div className="w-24 shrink-0">
                          <label className={labelClass}>Code</label>
                          <select
                            value={applicant.secondaryContactCode}
                            onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryContactCode', e.target.value)}
                            className={getInputClass(`secondary_${idx}_secondaryContactCode`)}
                          >
                            {countriesList.map(c => (
                              <option key={`${c.code}-${c.dial_code}`} value={c.dial_code}>
                                {c.dial_code} ({c.name})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className={labelClass}>Contact Number</label>
                          <input
                            type="text"
                            value={applicant.secondaryContactNumber}
                            onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryContactNumber', e.target.value)}
                            className={getInputClass(`secondary_${idx}_secondaryContactNumber`)}
                          />
                          {errors[`secondary_${idx}_secondaryContactNumber`] && (
                            <span className="text-xs text-red-500 mt-1 block">
                              {errors[`secondary_${idx}_secondaryContactNumber`]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Email Address</label>
                        <input
                          type="email"
                          value={applicant.secondaryEmail}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryEmail', e.target.value)}
                          className={getInputClass(`secondary_${idx}_secondaryEmail`)}
                        />
                        {errors[`secondary_${idx}_secondaryEmail`] && (
                          <span className="text-xs text-red-500 mt-1 block">
                            {errors[`secondary_${idx}_secondaryEmail`]}
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Residential Address</label>
                        <textarea
                          value={applicant.secondaryAddress}
                          onChange={(e) => handleSecondaryApplicantChange(idx, 'secondaryAddress', e.target.value)}
                          rows={2}
                          className={getInputClass(`secondary_${idx}_secondaryAddress`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center mt-6 space-x-3">
        {activeTab > 0 && (
          <button type="button" onClick={() => { setGlobalError(''); setActiveTab(activeTab - 1); }} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">
            Previous
          </button>
        )}
        {activeTab < tabs.length - 1 && (
          <button type="button" onClick={validateAndNext} className="px-5 py-2.5 bg-sky-700 text-white rounded-lg hover:bg-sky-800 font-medium text-sm">
            Save & Next
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={loading} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-50">
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => navigate('/leads')} className="px-5 py-2.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
