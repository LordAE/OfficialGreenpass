import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Program } from '@/api/entities';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const programData = [
  {
    "institution_name": "Bodwell High School", "institution_type": "University", "institution_logo_url": "https://www.bodwell.edu/wp-content/uploads/2021/04/bodwell-logo.svg", "school_name": "Bodwell High School", "school_country": "Canada", "school_province": "BC", "school_city": "North Vancouver", "program_title": "Grade 9 Program", "program_level": "grade_9", "field_of_study": "Secondary Education", "duration_display": "1 year", "tuition_fee_cad": 26000, "intake_dates": ["Fall 2026", "Winter 2027"], "is_dli": true, "dli_number": "O19339464222"
  },
  {
    "institution_name": "Columbia International College", "institution_type": "University", "institution_logo_url": "https://www.cic-totalcare.com/wp-content/uploads/2021/11/columbia-international-college-cic-logo.png", "school_name": "Columbia International College", "school_country": "Canada", "school_province": "ON", "school_city": "Hamilton", "program_title": "Grade 10 Program", "program_level": "grade_10", "field_of_study": "Secondary Education", "duration_display": "1 year", "tuition_fee_cad": 25500, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19395013152"
  },
  {
    "institution_name": "Pickering College", "institution_type": "University", "institution_logo_url": "https://yt3.googleusercontent.com/ytc/AIdro_k6hY42xT0_U4e-vU51hF-8y8HqKjE0F7qEw=s900-c-k-c0x00ffffff-no-rj", "school_name": "Pickering College", "school_country": "Canada", "school_province": "ON", "school_city": "Newmarket", "program_title": "Grade 11 Program", "program_level": "grade_11", "field_of_study": "Secondary Education", "duration_display": "1 year", "tuition_fee_cad": 65000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19395013232"
  },
  {
    "institution_name": "St. Andrew's College", "institution_type": "University", "institution_logo_url": "https://www.sac.on.ca/uploaded/SAC_Crest_Transparent_1.png", "school_name": "St. Andrew's College", "school_country": "Canada", "school_province": "ON", "school_city": "Aurora", "program_title": "Grade 12 University Preparation", "program_level": "grade_12", "field_of_study": "Secondary Education", "duration_display": "1 year", "tuition_fee_cad": 70000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19395013242"
  },
  {
    "institution_name": "Seneca College", "institution_type": "College", "institution_logo_url": "https://www.senecacollege.ca/content/dam/style-assets/images/header/seneca-logo.svg", "school_name": "Seneca College - Newnham Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Business Administration - Management", "program_level": "advanced_diploma", "field_of_study": "Business", "duration_display": "3 years", "tuition_fee_cad": 19500, "intake_dates": ["Winter 2026", "Spring 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19395536013"
  },
  {
    "institution_name": "Humber College", "institution_type": "College", "institution_logo_url": "https://humber.ca/today/sites/default/files/humber_logo_horizontal_2022_rgb.png", "school_name": "Humber College - North Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Architectural Technology", "program_level": "advanced_diploma", "field_of_study": "Architecture", "duration_display": "3 years", "tuition_fee_cad": 21000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19376943142"
  },
  {
    "institution_name": "George Brown College", "institution_type": "College", "institution_logo_url": "https://www.georgebrown.ca/sites/all/themes/custom/gbc/logo.svg", "school_name": "George Brown College - Casa Loma Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Game - Art", "program_level": "advanced_diploma", "field_of_study": "Arts", "duration_display": "3 years", "tuition_fee_cad": 22000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19283850612"
  },
  {
    "institution_name": "University of Toronto", "institution_type": "University", "institution_logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Utoronto_coa.svg/1200px-Utoronto_coa.svg.png", "school_name": "University of Toronto - St. George Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Master of Financial Economics", "program_level": "master", "field_of_study": "Economics", "duration_display": "1.5 years", "tuition_fee_cad": 65000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19332289682"
  },
  {
    "institution_name": "University of British Columbia", "institution_type": "University", "institution_logo_url": "https://www.ubc.ca/brand/resources/downloads/ubc_logo_2018_fullsig_blue72_rgb_1.png", "school_name": "University of British Columbia - Vancouver Campus", "school_country": "Canada", "school_province": "BC", "school_city": "Vancouver", "program_title": "Bachelor of Applied Science in Electrical Engineering", "program_level": "bachelor", "field_of_study": "Engineering", "duration_display": "4 years", "tuition_fee_cad": 58000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19330231062"
  },
  {
    "institution_name": "McGill University", "institution_type": "University", "institution_logo_url": "https://www.mcgill.ca/visual-identity/files/visual-identity/mcgill_logo_red.jpg", "school_name": "McGill University", "school_country": "Canada", "school_province": "QC", "school_city": "Montreal", "program_title": "PhD in Experimental Medicine", "program_level": "doctorate", "field_of_study": "Health Sciences", "duration_display": "4 years", "tuition_fee_cad": 22000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19359011058"
  },
  {
    "institution_name": "University of Alberta", "institution_type": "University", "institution_logo_url": "https://www.ualberta.ca/media-library/ualberta/home/assets/logos/green-new/ualberta-logo-green-horizontal.png", "school_name": "University of Alberta", "school_country": "Canada", "school_province": "AB", "school_city": "Edmonton", "program_title": "Bachelor of Science in Nursing", "program_level": "bachelor", "field_of_study": "Health Sciences", "duration_display": "4 years", "tuition_fee_cad": 28000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19257171832"
  },
  {
    "institution_name": "McMaster University", "institution_type": "University", "institution_logo_url": "https://www.mcmaster.ca/wp-content/uploads/2023/07/McMasterUniversity-Main-Logo-1.png", "school_name": "McMaster University", "school_country": "Canada", "school_province": "ON", "school_city": "Hamilton", "program_title": "Master of Business Administration (MBA)", "program_level": "master", "field_of_study": "Business", "duration_display": "2 years", "tuition_fee_cad": 48000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19395535729"
  },
  {
    "institution_name": "University of Waterloo", "institution_type": "University", "institution_logo_url": "https://uwaterloo.ca/brand/sites/ca.brand/files/styles/body-500px-wide/public/uploads/images/universityofwaterloo_logo_horiz_rgb_1.jpg", "school_name": "University of Waterloo", "school_country": "Canada", "school_province": "ON", "school_city": "Waterloo", "program_title": "Bachelor of Computer Science (Co-op)", "program_level": "bachelor", "field_of_study": "Technology", "duration_display": "5 years", "tuition_fee_cad": 63000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19301308302"
  },
  {
    "institution_name": "Western University", "institution_type": "University", "institution_logo_url": "https://www.uwo.ca/img/visid/western-logo-main-standard-web.png", "school_name": "Western University", "school_country": "Canada", "school_province": "ON", "school_city": "London", "program_title": "Bachelor of Arts in Psychology", "program_level": "bachelor", "field_of_study": "Arts", "duration_display": "4 years", "tuition_fee_cad": 38000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19376021222"
  },
  {
    "institution_name": "Queen's University", "institution_type": "University", "institution_logo_url": "https://www.queensu.ca/identity/sites/identity.queensu.ca/files/2023-09/horizontal-queens-logo-b-cmyk.png", "school_name": "Queen's University", "school_country": "Canada", "school_province": "ON", "school_city": "Kingston", "program_title": "Master of Public Administration", "program_level": "master", "field_of_study": "Public Administration", "duration_display": "1 year", "tuition_fee_cad": 35000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19376021322"
  },
  {
    "institution_name": "British Columbia Institute of Technology (BCIT)", "institution_type": "College", "institution_logo_url": "https://www.bcit.ca/wp-content/uploads/2022/11/bcit-logo-2022-horizontal-rgb.png", "school_name": "BCIT - Burnaby Campus", "school_country": "Canada", "school_province": "BC", "school_city": "Burnaby", "program_title": "Diploma in Mechanical Engineering Technology", "program_level": "diploma", "field_of_study": "Engineering", "duration_display": "2 years", "tuition_fee_cad": 23000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19330128542"
  },
  {
    "institution_name": "Southern Alberta Institute of Technology (SAIT)", "institution_type": "College", "institution_logo_url": "https://www.sait.ca/images/default-source/social-sharing-images/sait-social-sharing-image.jpg", "school_name": "SAIT", "school_country": "Canada", "school_province": "AB", "school_city": "Calgary", "program_title": "Aircraft Maintenance Engineers Technology", "program_level": "diploma", "field_of_study": "Aviation", "duration_display": "2 years", "tuition_fee_cad": 24000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O18761182242"
  },
  {
    "institution_name": "Northern Alberta Institute of Technology (NAIT)", "institution_type": "College", "institution_logo_url": "https://www.nait.ca/nait/assets/templates/nait-responsive/img/logo.png", "school_name": "NAIT", "school_country": "Canada", "school_province": "AB", "school_city": "Edmonton", "program_title": "Culinary Arts", "program_level": "diploma", "field_of_study": "Hospitality", "duration_display": "2 years", "tuition_fee_cad": 20000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O18713200642"
  },
  {
    "institution_name": "University of Calgary", "institution_type": "University", "institution_logo_url": "https://ucalgary.ca/images/default-source/header-footer-utility/ucalgary_logo_h_rgb-01.png", "school_name": "University of Calgary", "school_country": "Canada", "school_province": "AB", "school_city": "Calgary", "program_title": "Doctor of Veterinary Medicine", "program_level": "professional_degree", "field_of_study": "Health Sciences", "duration_display": "4 years", "tuition_fee_cad": 15000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O18886830282"
  },
  {
    "institution_name": "Dalhousie University", "institution_type": "University", "institution_logo_url": "https://cdn.dal.ca/etc/designs/dalhousie/clientlibs/global/default/resources/images/dal-logo-black.svg", "school_name": "Dalhousie University", "school_country": "Canada", "school_province": "NS", "school_city": "Halifax", "program_title": "Master of Marine Management", "program_level": "master", "field_of_study": "Environmental Science", "duration_display": "1.5 years", "tuition_fee_cad": 25000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19207820792"
  },
  {
    "institution_name": "Simon Fraser University", "institution_type": "University", "institution_logo_url": "https://www.sfu.ca/assets/img/sfu-logo-dark.svg", "school_name": "Simon Fraser University - Burnaby Campus", "school_country": "Canada", "school_province": "BC", "school_city": "Burnaby", "program_title": "Bachelor of Science in Kinesiology", "program_level": "bachelor", "field_of_study": "Health Sciences", "duration_display": "4 years", "tuition_fee_cad": 32000, "intake_dates": ["Winter 2026", "Spring 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19238919192"
  },
  {
    "institution_name": "University of Victoria", "institution_type": "University", "institution_logo_url": "https://www.uvic.ca/assets/images/header-logo-signature.svg", "school_name": "University of Victoria", "school_country": "Canada", "school_province": "BC", "school_city": "Victoria", "program_title": "Bachelor of Software Engineering", "program_level": "bachelor", "field_of_study": "Technology", "duration_display": "4 years", "tuition_fee_cad": 35000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19280533442"
  },
  {
    "institution_name": "York University", "institution_type": "University", "institution_logo_url": "https://www.yorku.ca/style-guide/wp-content/uploads/sites/11/2020/06/yorku-logo-hor-rgb.png", "school_name": "York University", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Master of Laws (LLM) in International Business Law", "program_level": "master", "field_of_study": "Law", "duration_display": "1 year", "tuition_fee_cad": 40000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19361109342"
  },
  {
    "institution_name": "University of Ottawa", "institution_type": "University", "institution_logo_url": "https://www.uottawa.ca/brand/sites/www.uottawa.ca.brand/files/uottawa_ver_black.png", "school_name": "University of Ottawa", "school_country": "Canada", "school_province": "ON", "school_city": "Ottawa", "program_title": "Doctorate in Philosophy (PhD) in Biomedical Engineering", "program_level": "doctorate", "field_of_study": "Engineering", "duration_display": "4 years", "tuition_fee_cad": 18000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19397188992"
  },
  {
    "institution_name": "Conestoga College", "institution_type": "College", "institution_logo_url": "https://www.conestogac.on.ca/img/conestoga-logo.png", "school_name": "Conestoga College - Doon Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Kitchener", "program_title": "Web Development", "program_level": "diploma", "field_of_study": "Technology", "duration_display": "2 years", "tuition_fee_cad": 17000, "intake_dates": ["Winter 2026", "Spring 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19376943142"
  },
  {
    "institution_name": "Langara College", "institution_type": "College", "institution_logo_url": "https://langara.ca/reg-guide/201910/images/langara-logo.svg", "school_name": "Langara College", "school_country": "Canada", "school_province": "BC", "school_city": "Vancouver", "program_title": "Associate of Science in Biology", "program_level": "associate_degree", "field_of_study": "Science", "duration_display": "2 years", "tuition_fee_cad": 19000, "intake_dates": ["Winter 2026", "Spring 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19319074622"
  },
  {
    "institution_name": "Fanshawe College", "institution_type": "College", "institution_logo_url": "https://www.fanshawec.ca/sites/default/files/2023-01/logo_0.png", "school_name": "Fanshawe College - London Campus", "school_country": "Canada", "school_province": "ON", "school_city": "London", "program_title": "Early Childhood Education", "program_level": "diploma", "field_of_study": "Education", "duration_display": "2 years", "tuition_fee_cad": 16500, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19361039982"
  },
  {
    "institution_name": "Algonquin College", "institution_type": "College", "institution_logo_url": "https://www.algonquincollege.com/corp/files/2016/09/AC-HORIZ-LOGO-2019-V1small.png", "school_name": "Algonquin College - Ottawa Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Ottawa", "program_title": "Animation", "program_level": "advanced_diploma", "field_of_study": "Arts", "duration_display": "3 years", "tuition_fee_cad": 23000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19358971022"
  },
  {
    "institution_name": "University of Manitoba", "institution_type": "University", "institution_logo_url": "https://umanitoba.ca/sites/default/files/2021-01/um-logo-horizontal-black.png", "school_name": "University of Manitoba", "school_country": "Canada", "school_province": "MB", "school_city": "Winnipeg", "program_title": "Bachelor of Environmental Design", "program_level": "bachelor", "field_of_study": "Architecture", "duration_display": "4 years", "tuition_fee_cad": 22000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19091528512"
  },
  {
    "institution_name": "Carleton University", "institution_type": "University", "institution_logo_url": "https://carleton.ca/brand/wp-content/uploads/cu-logo-horizontal.png", "school_name": "Carleton University", "school_country": "Canada", "school_province": "ON", "school_city": "Ottawa", "program_title": "Master of Journalism", "program_level": "master", "field_of_study": "Journalism", "duration_display": "2 years", "tuition_fee_cad": 28000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19359011032"
  },
  {
    "institution_name": "Ryerson University (Toronto Metropolitan University)", "institution_type": "University", "institution_logo_url": "https://www.torontomu.ca/content/dam/brand/global/images/TMU-logo-horiz-blue.svg", "school_name": "Toronto Metropolitan University", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Bachelor of Commerce - Hospitality and Tourism Management", "program_level": "bachelor", "field_of_study": "Hospitality", "duration_display": "4 years", "tuition_fee_cad": 33000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19397183942"
  },
  {
    "institution_name": "Concordia University", "institution_type": "University", "institution_logo_url": "https://www.concordia.ca/content/dam/concordia/images/brand/logo/cu-logo-bg-red.png", "school_name": "Concordia University", "school_country": "Canada", "school_province": "QC", "school_city": "Montreal", "program_title": "Master of Applied Computer Science", "program_level": "master", "field_of_study": "Technology", "duration_display": "2 years", "tuition_fee_cad": 25000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19359011042"
  },
  {
    "institution_name": "ILAC International College", "institution_type": "College", "institution_logo_url": "https://www.ilac.com/wp-content/themes/ilac/assets/img/ilac-logo.svg", "school_name": "ILAC International College - Toronto", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Service Excellence for Business", "program_level": "diploma", "field_of_study": "Business", "duration_display": "1 year", "tuition_fee_cad": 10000, "intake_dates": ["Winter 2026", "Spring 2026", "Summer 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19319212232"
  },
  {
    "institution_name": "Centennial College", "institution_type": "College", "institution_logo_url": "https://www.centennialcollege.ca/media/1w4tnrve/centennial-college-logo-horizontal.svg", "school_name": "Centennial College - Progress Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Automotive - Motive Power Technician", "program_level": "diploma", "field_of_study": "Trades", "duration_display": "2 years", "tuition_fee_cad": 18000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19395535722"
  },
  {
    "institution_name": "Niagara College", "institution_type": "College", "institution_logo_url": "https://www.niagaracollege.ca/wp-content/themes/niagaracollege/img/logo-nc-stacked-blue-rgb.png", "school_name": "Niagara College - Welland Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Welland", "program_title": "Brewmaster and Brewery Operations Management", "program_level": "graduate_certificate", "field_of_study": "Hospitality", "duration_display": "1 year", "tuition_fee_cad": 22000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19396013442"
  },
  {
    "institution_name": "OCAD University", "institution_type": "University", "institution_logo_url": "https://www.ocadu.ca/sites/default/files/OCAD_University_Logo_Black.png", "school_name": "OCAD University", "school_country": "Canada", "school_province": "ON", "school_city": "Toronto", "program_title": "Bachelor of Design in Industrial Design", "program_level": "bachelor", "field_of_study": "Arts", "duration_display": "4 years", "tuition_fee_cad": 30000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19332289692"
  },
  {
    "institution_name": "University of Guelph", "institution_type": "University", "institution_logo_url": "https://www.uoguelph.ca/img/u-of-g-logo.svg", "school_name": "University of Guelph", "school_country": "Canada", "school_province": "ON", "school_city": "Guelph", "program_title": "Bachelor of Science in Agriculture", "program_level": "bachelor", "field_of_study": "Agriculture", "duration_display": "4 years", "tuition_fee_cad": 31000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19305391192"
  },
  {
    "institution_name": "Brock University", "institution_type": "University", "institution_logo_url": "https://brocku.ca/brand/wp-content/uploads/sites/11/Brock-University-Logo-Red-1.png", "school_name": "Brock University", "school_country": "Canada", "school_province": "ON", "school_city": "St. Catharines", "program_title": "Bachelor of Sport Management", "program_level": "bachelor", "field_of_study": "Business", "duration_display": "4 years", "tuition_fee_cad": 33000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19394569012"
  },
  {
    "institution_name": "Thompson Rivers University", "institution_type": "University", "institution_logo_url": "https://www.tru.ca/__shared/assets/Wordmark_Colour_Basic2434.png", "school_name": "Thompson Rivers University", "school_country": "Canada", "school_province": "BC", "school_city": "Kamloops", "program_title": "Post-Baccalaureate Diploma in Marketing", "program_level": "graduate_diploma", "field_of_study": "Business", "duration_display": "2 years", "tuition_fee_cad": 20000, "intake_dates": ["Winter 2026", "Spring 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19395299482"
  },
  {
    "institution_name": "Capilano University", "institution_type": "University", "institution_logo_url": "https://www.capilanou.ca/media/capilanouca/style-assets/images/logos-and-branding/capu-logo-rgb-blue-and-red.png", "school_name": "Capilano University", "school_country": "Canada", "school_province": "BC", "school_city": "North Vancouver", "program_title": "Bachelor of Motion Picture Arts", "program_level": "bachelor", "field_of_study": "Arts", "duration_display": "4 years", "tuition_fee_cad": 25000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19280026322"
  },
  {
    "institution_name": "Emily Carr University of Art + Design", "institution_type": "University", "institution_logo_url": "https://www.ecuad.ca/sites/default/files/2019-11/ECU-Wordmark-RGB-Black.png", "school_name": "Emily Carr University of Art + Design", "school_country": "Canada", "school_province": "BC", "school_city": "Vancouver", "program_title": "Master of Design", "program_level": "master", "field_of_study": "Arts", "duration_display": "2 years", "tuition_fee_cad": 28000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19319074582"
  },
  {
    "institution_name": "Trent University", "institution_type": "University", "institution_logo_url": "https://www.trentu.ca/themes/custom/trent_bootstrap/logo.svg", "school_name": "Trent University - Peterborough Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Peterborough", "program_title": "Bachelor of Science in Forensic Science", "program_level": "bachelor", "field_of_study": "Science", "duration_display": "4 years", "tuition_fee_cad": 30000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19395164223"
  },
  {
    "institution_name": "University of Saskatchewan", "institution_type": "University", "institution_logo_url": "https://usask.ca/communications/visual-id/files/USask-logo-primary-horizontal.png", "school_name": "University of Saskatchewan", "school_country": "Canada", "school_province": "SK", "school_city": "Saskatoon", "program_title": "PhD in Toxicology", "program_level": "doctorate", "field_of_study": "Science", "duration_display": "4 years", "tuition_fee_cad": 10000, "intake_dates": ["Winter 2026", "Fall 2026"], "is_dli": true, "dli_number": "O19425660282"
  },
  {
    "institution_name": "Ontario Tech University", "institution_type": "University", "institution_logo_url": "https://ontariotechu.ca/layout/themes/ot/images/ot-logo-horizontal.svg", "school_name": "Ontario Tech University", "school_country": "Canada", "school_province": "ON", "school_city": "Oshawa", "program_title": "Bachelor of Engineering in Automotive Engineering", "program_level": "bachelor", "field_of_study": "Engineering", "duration_display": "4 years", "tuition_fee_cad": 36000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19315967922"
  },
  {
    "institution_name": "Kwantlen Polytechnic University", "institution_type": "University", "institution_logo_url": "https://www.kpu.ca/sites/all/themes/kpu_theme/logo.svg", "school_name": "KPU - Richmond Campus", "school_country": "Canada", "school_province": "BC", "school_city": "Richmond", "program_title": "Bachelor of Design in Fashion and Technology", "program_level": "bachelor", "field_of_study": "Arts", "duration_display": "4 years", "tuition_fee_cad": 24000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19350676872"
  },
  {
    "institution_name": "Mohawk College", "institution_type": "College", "institution_logo_url": "https://www.mohawkcollege.ca/themes/custom/mohawk/logo.svg", "school_name": "Mohawk College", "school_country": "Canada", "school_province": "ON", "school_city": "Hamilton", "program_title": "Cardiovascular Technology", "program_level": "advanced_diploma", "field_of_study": "Health Sciences", "duration_display": "3 years", "tuition_fee_cad": 26000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19376045902"
  },
  {
    "institution_name": "Sheridan College", "institution_type": "College", "institution_logo_url": "https://www.sheridancollege.ca/-/media/project/sheridan/shared/images/header-and-footer/sheridan-logo.svg", "school_name": "Sheridan College - Trafalgar Road Campus", "school_country": "Canada", "school_province": "ON", "school_city": "Oakville", "program_title": "Bachelor of Animation", "program_level": "bachelor_honours", "field_of_study": "Arts", "duration_display": "4 years", "tuition_fee_cad": 31000, "intake_dates": ["Fall 2026"], "is_dli": true, "dli_number": "O19385946782"
  }
];

export default function ProgramDataSeeder() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleSeedData = async () => {
        if (!window.confirm(`Are you sure you want to add ${programData.length} new program records to the database? This cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setStatus('Starting to seed data...');
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < programData.length; i++) {
            const record = programData[i];
            try {
                await Program.create(record);
                successCount++;
                setStatus(`Seeding... ${successCount}/${programData.length} records created.`);
                // Add a small delay to avoid potential rate limiting
                await new Promise(resolve => setTimeout(resolve, 100)); 
            } catch (error) {
                console.error(`Failed to create record ${i + 1}:`, error);
                errorCount++;
            }
        }

        setLoading(false);
        setStatus(`Seeding complete. ${successCount} successful. ${errorCount} failed.`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Program Data Seeder</CardTitle>
                <CardDescription>
                    Use this tool to add new program data into the database. This is a workaround for a temporary platform issue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    This will add <strong>{programData.length}</strong> new program records with intake dates in 2026 and beyond.
                </p>
                <Button onClick={handleSeedData} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? 'Seeding...' : `Seed Program Data`}
                </Button>
                {status && <p className="mt-4 text-sm font-medium">{status}</p>}
            </CardContent>
        </Card>
    );
}