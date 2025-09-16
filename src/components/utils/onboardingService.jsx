import { User } from '@/api/entities';

export const completeOnboardingProcess = async (user, selectedRole, formData) => {
  if (!user || !selectedRole || !formData) {
    throw new Error("Missing required data for onboarding completion.");
  }

  // 1. Update user basic information and role
  await User.updateMyUserData({
    user_type: selectedRole,
    full_name: formData.full_name,
    phone: formData.phone,
    country: formData.country,
    onboarding_completed: true
  });

  // 2. Create role-specific entity using dynamic imports
  switch (selectedRole) {
    case 'agent':
      try {
        const { Agent } = await import('@/api/entities');
        await Agent.create({
          user_id: user.id,
          company_name: formData.company_name,
          business_license_mst: formData.business_license_mst,
          paypal_email: formData.paypal_email,
          year_established: parseInt(formData.year_established) || null,
          referral_code: `AG${Date.now().toString().slice(-6)}`
        });
      } catch (error) {
        console.error('Error creating Agent entity:', error);
        throw new Error('Failed to create agent profile');
      }
      break;
      
    case 'tutor':
      try {
        const { Tutor } = await import('@/api/entities');
        await Tutor.create({
          user_id: user.id,
          specializations: formData.specializations ? formData.specializations.split(',').map(s => s.trim()) : [],
          experience_years: parseInt(formData.experience_years) || 0,
          hourly_rate: parseFloat(formData.hourly_rate) || 0,
          bio: formData.bio || '',
          paypal_email: formData.paypal_email
        });
      } catch (error) {
        console.error('Error creating Tutor entity:', error);
        throw new Error('Failed to create tutor profile');
      }
      break;
      
    case 'school':
      try {
        const { SchoolProfile } = await import('@/api/entities'); // Changed to SchoolProfile
        await SchoolProfile.create({
          user_id: user.id,
          name: formData.school_name,
          school_level: formData.type, // Changed from type to school_level
          location: formData.location,
          country: formData.country,
          website: formData.website,
          about: formData.about || ''
        });
      } catch (error) {
        console.error('Error creating SchoolProfile entity:', error);
        throw new Error('Failed to create school profile');
      }
      break;
      
    case 'vendor':
      try {
        const { Vendor } = await import('@/api/entities');
        await Vendor.create({
          user_id: user.id,
          business_name: formData.business_name,
          service_categories: formData.service_categories || [],
          paypal_email: formData.paypal_email
        });
      } catch (error) {
        console.error('Error creating Vendor entity:', error);
        throw new Error('Failed to create vendor profile');
      }
      break;
      
    default:
      // 'user' or 'student' role doesn't need a separate entity created here.
      break;
  }
};