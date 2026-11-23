"""
Seeds the exact 26 canonical CharmHealth Email Templates into ehr.db and ehr_master.db.
Extracted from CharmHealth screen recording with exact subjects, bodies, and tokens.
"""

import sqlite3
import os
import json

TEMPLATES = [
    {
        "name": "Appointment Cancellation",
        "subject": "Appointment Cancelled",
        "banner_title": "Appointment Cancelled",
        "icon": "calendar-x",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your appointment with ${Appointment.Provider} on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time} has been cancelled.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification sent to patient when an appointment is cancelled."
    },
    {
        "name": "Appointment Confirmation",
        "subject": "Appointment Confirmed",
        "banner_title": "Appointment Confirmed",
        "icon": "calendar-check",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your appointment with ${Appointment.Provider} has been confirmed on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time} for ${Appointment.Duration} Minutes.\n\n"
            "${Appointment.Message To Patient}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Standard appointment confirmation email with duration and clinic details."
    },
    {
        "name": "Appointment Confirmation (periodic)",
        "subject": "Appointment Confirmed",
        "banner_title": "Appointment Confirmed",
        "icon": "calendar-clock",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your recurring appointment series with ${Appointment.Provider} has been scheduled. Your next session is on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time} for ${Appointment.Duration} Minutes.\n\n"
            "${Appointment.Message To Patient}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Confirmation for periodic/recurring clinical appointments such as EECP cycles."
    },
    {
        "name": "Appointment Confirmation (Video Consult - Join URL)",
        "subject": "Video Consult Confirmation",
        "banner_title": "Video Consult Confirmation",
        "icon": "video",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your appointment with ${Appointment.Provider} has been confirmed on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time} for ${Appointment.Duration} Minutes.\n\n"
            "${Appointment.Message To Patient}\n\n"
            "Join the video session 30 minutes prior to appointment time, using the link below. If clicking on the link doesn't work, copy and paste it into your browser.\n\n"
            "${TeleHealth.Invitation}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "TeleHealth video consultation confirmation containing direct join URL."
    },
    {
        "name": "Appointment Confirmation (Video Consult - PHR)",
        "subject": "Video Consult Confirmation",
        "banner_title": "Video Consult Confirmation",
        "icon": "video-phr",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your video consultation with ${Appointment.Provider} has been confirmed on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time} for ${Appointment.Duration} Minutes.\n\n"
            "Please login to your Patient Portal (PHR) account 15 minutes before your scheduled appointment time to start your telehealth consultation.\n\n"
            "Login to Patient Portal: ${PHR.LoginURL}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "TeleHealth confirmation directing patient to login via Patient Portal."
    },
    {
        "name": "Appointment Reminder",
        "subject": "Appointment Reminder",
        "banner_title": "Appointment Reminder",
        "icon": "calendar-bell",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "This is a courtesy reminder that you have an appointment with ${Appointment.Provider} on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time}.\n\n"
            "Please arrive 10 minutes prior to your scheduled time and bring your prior medical reports.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Automated courtesy appointment reminder sent prior to scheduled consultation."
    },
    {
        "name": "Appointment Reminder (Video Consult - Join URL)",
        "subject": "Video Consult Reminder",
        "banner_title": "Video Consult Reminder",
        "icon": "video-bell",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "This is a courtesy reminder that you have a video consultation scheduled with ${Appointment.Provider} on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time}\n\n"
            "Join the video session 30 minutes prior to appointment time, using the link below. If clicking on the link doesn't work, copy and paste it into your browser.\n\n"
            "${TeleHealth.Invitation}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Courtesy reminder for video consult with TeleHealth direct join link."
    },
    {
        "name": "Appointment Reminder (Video Consult - PHR)",
        "subject": "Video Consult Reminder",
        "banner_title": "Video Consult Reminder",
        "icon": "video-bell",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "This is a reminder that you have a video consultation scheduled with ${Appointment.Provider} on ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time}.\n\n"
            "Please login to your Patient Portal account to join the consultation session.\n\n"
            "Login to Patient Portal: ${PHR.LoginURL}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Video consult reminder instructing patient to access portal."
    },
    {
        "name": "Appointment Request Deny",
        "subject": "Appointment Request Status",
        "banner_title": "Appointment Request",
        "icon": "calendar-x",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "We are not able to confirm your appointment request with ${Appointment.Provider}. Please call our office to clarify your request.\n\n"
            "${Appointment.Reason To Deny}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Email sent when patient's online appointment request cannot be scheduled."
    },
    {
        "name": "Appointment Request Deny (Without Provider)",
        "subject": "Appointment Request Denied",
        "banner_title": "Appointment Request",
        "icon": "calendar-x",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "We are not able to confirm your appointment request. Please call our office to clarify your request.\n\n"
            "${Appointment.Reason To Deny}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "General appointment request denial notification without provider reference."
    },
    {
        "name": "Appointment Reschedule",
        "subject": "Appointment Rescheduled",
        "banner_title": "Appointment Rescheduled",
        "icon": "calendar-sync",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your appointment with ${Appointment.Provider} has been rescheduled to ${Appointment.Day} ${Appointment.Date} at ${Appointment.Time}.\n\n"
            "${Appointment.Message To Patient}\n\n"
            "If this new timing does not work for you, please reply or call us to adjust.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification sent when appointment timing or date is rescheduled."
    },
    {
        "name": "Documents Shared",
        "subject": "Documents Shared",
        "banner_title": "Documents Shared",
        "icon": "file-text",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Clinical documents have been shared to your Patient Portal account.\n\n"
            "Follow the steps below to access them:\n"
            "1. Login to the Patient Portal: ${PHR.LoginURL}\n"
            "2. Go to the Documents section\n"
            "3. Click on the document to view or download in PDF format.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification sent when medical records or clinical files are uploaded to portal."
    },
    {
        "name": "Feedback Form Notification (Automated)",
        "subject": "Your feedback is important to us",
        "banner_title": "Patient Feedback",
        "icon": "star",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Greetings from Heal Your Heart Neelankarai!\n\n"
            "We hope you are satisfied with our service during your consultation on ${Consultation.Date} with ${Consultation.Provider}.\n\n"
            "We value your opinion and would love to hear your feedback.\n\n"
            "Click on the link below to share your valuable feedback:-\n"
            "${Feedback.Link}\n\n"
            "Thank you for your time.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Automated post-consultation patient satisfaction feedback email."
    },
    {
        "name": "Feedback Form Notification (Manual Send)",
        "subject": "Your feedback is important to us",
        "banner_title": "Patient Feedback",
        "icon": "star",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Greetings from Heal Your Heart Neelankarai!\n\n"
            "We hope you are satisfied with our service.\n\n"
            "We value your opinion and would love to hear your feedback.\n\n"
            "Click on the link below to share your valuable feedback:-\n"
            "${Feedback.Link}\n\n"
            "Thank you for your time.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Manual patient experience and clinical care review request email."
    },
    {
        "name": "Lab Order Shared",
        "subject": "Lab Order Shared",
        "banner_title": "Lab Order Shared",
        "icon": "flask",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Your healthcare provider has placed a lab order for you.\n\n"
            "Please view the recommended diagnostic lab investigations in your Patient Portal account before your visit:\n"
            "Login to Patient Portal: ${PHR.LoginURL}\n\n"
            "Navigate to the Labs section to download your Lab Order requisition slip.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification alerting patient that diagnostic lab orders have been generated."
    },
    {
        "name": "Labs Shared",
        "subject": "Lab Results Shared",
        "banner_title": "Labs Results Shared",
        "icon": "flask",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "We have shared some lab result(s) to your Patient Portal account.\n\n"
            "Follow the steps below to access them\n"
            "Login to the Patient Portal\n"
            "Go to the Labs section\n"
            "Click on the row you wish to see under 'Results' tab to view the result\n"
            "You can also download the results by using 'Download' button present in the result page\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification sent when lab test findings and bloodwork reports are published."
    },
    {
        "name": "Message Notification",
        "subject": "Message Notification",
        "banner_title": "Message Notification",
        "icon": "mail",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "You have a new message in your Patient Portal account.\n\n"
            "Follow the steps below to view it\n"
            "Login to the Patient Portal\n"
            "Go to the Messages section\n"
            "Click on the message to view it\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification alerting patient of secure message received in portal inbox."
    },
    {
        "name": "PHR Health Channel",
        "subject": "Health Channel Notification",
        "banner_title": "Health Channel Notification",
        "icon": "heart",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "New cardiology and EECP wellness updates have been posted to your Patient Health Channel.\n\n"
            "Visit your Patient Portal to review customized diet, exercise, and heart health resources prepared by our clinical team.\n\n"
            "Login to Patient Portal: ${PHR.LoginURL}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Broadcast notification for health education and preventive cardiology articles."
    },
    {
        "name": "PHR Invitation",
        "subject": "Patient Portal Registration",
        "banner_title": "Patient Portal Registration",
        "icon": "user-plus",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "You have an invitation from Heal Your Heart Neelankarai to create your Patient Portal account.\n\n"
            "Click on the link below to register your account. If clicking on the link doesn't work, copy and paste it into your browser.\n\n"
            "${PHR.RegisterLink}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Invitation email enabling new patients to register and activate patient portal."
    },
    {
        "name": "PHR Welcome Email",
        "subject": "Welcome to Patient Portal",
        "banner_title": "Welcome to Patient Portal",
        "icon": "user-check",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Welcome to the Heal Your Heart Patient Portal!\n\n"
            "Your account has been successfully verified. You can now conveniently view your consultation summaries, lab results, prescriptions, and schedule your appointments online.\n\n"
            "Access your account anytime at: ${PHR.LoginURL}\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Welcome confirmation message sent upon successful portal account activation."
    },
    {
        "name": "Questionnaire Notification",
        "subject": "Questionnaire Notification",
        "banner_title": "Questionnaire Notification",
        "icon": "clipboard-list",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Please fill out the questionnaire(s) for your upcoming appointment.\n\n"
            "${Appointment.Questionnaire}\n\n"
            "If you do not have a Patient Portal account, register an account using the PHR invitation sent to your email.\n\n"
            "Once the Patient Portal account is registered, follow these steps to fill out the questionnaire(s):\n"
            "1. Login to the Patient Portal\n"
            "2. Click on the Questionnaires section\n"
            "3. Complete the above questionnaire(s) and click on the Submit button.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Pre-consultation clinical questionnaire request sent to patient portal."
    },
    {
        "name": "Questionnaire Notification (Secure Link)",
        "subject": "Questionnaire Notification",
        "banner_title": "Questionnaire Notification",
        "icon": "clipboard-check",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Please fill out the questionnaire(s) for your upcoming appointment using the link below. If clicking on the link doesn't work, copy and paste it into your browser.\n\n"
            "${Questionnaire.Link}\n\n"
            "Use OTP ${Questionnaire.OTP}, which is valid for ${Questionnaire.OTP Validity} hours.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Secure one-time OTP link for completing clinical forms without portal login."
    },
    {
        "name": "Recall Reminder",
        "subject": "${Recall.Type} Reminder",
        "banner_title": "${Recall.Type} Reminder",
        "icon": "rotate-ccw",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "This is a courtesy reminder to schedule for a follow up.\n\n"
            "${Recall.Notes}\n\n"
            "Please disregard this message, if you already have a follow up scheduled.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Periodic patient recall notification for preventative cardiology checkups."
    },
    {
        "name": "Thank You Email after consultation",
        "subject": "Thank You",
        "banner_title": "Thank You",
        "icon": "heart-handshake",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Thank you for consulting with Heal Your Heart.\n\n"
            "Do share the Heal Your Heart - YouTube link to your family and friends and help them to avoid surgery / invasive procedures.\n\n"
            "Second Opinion Video:-\n"
            "English:- Are you suggested for Bypass surgery and Angioplasty?\n"
            "https://youtu.be/R9riO4eZ2NU\n\n"
            "Tamil:- பைபாஸ், ஆஞ்சியோ பரிந்துரைக்கப்பட்டால் Second Opinion பெறுவது எப்படி?\n"
            "https://youtu.be/CHXjTiUMyNs\n\n"
            "If you need a Second Opinion report on your heart desease, you can get it online by just filling the form in the below link:-\n"
            "Second Opinion\n\n"
            "We are pleased to have the opportunity to serve you.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Bilingual English/Tamil post-consultation thank you and second opinion resource email."
    },
    {
        "name": "Visit Summary Shared",
        "subject": "Visit Summary Shared",
        "banner_title": "Visit Summary Shared",
        "icon": "file-check",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "Visit Summary of your consultation on ${Appointment.Date} with ${Appointment.Provider} has been shared to your Patient Portal account.\n\n"
            "Follow the steps below to access it.\n"
            "Login to the Patient Portal\n"
            "Go to the Visit Summary section\n"
            "In the Visit Summary list shown ,Click the row you wish to see\n"
            "You can also download the visit summary in PDF format under 'Documents' section.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Notification alerting patient that visit summary note is ready for download."
    },
    {
        "name": "Waiting List Notification",
        "subject": "Waiting List Added",
        "banner_title": "Waiting List Added",
        "icon": "clock",
        "body": (
            "Dear ${Patient.Name},\n\n"
            "You have been added to the Waiting List for appointment with ${Appointment.Provider} on ${Appointment.Date}. We will inform you, if we could accommodate you for consultation on that date.\n\n"
            "Regards,\n"
            "Administrator\n"
            "Heal Your Heart Neelankarai\n"
            "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115"
        ),
        "description": "Confirmation when patient is placed on appointment waiting queue."
    }
]

def seed_database(db_path):
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist, skipping.")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print(f"--- Seeding {db_path} ---")

    # Delete existing email templates with duplicate names to ensure clean state
    cur.execute("DELETE FROM templates WHERE template_type = 'Email'")

    for idx, t in enumerate(TEMPLATES):
        name = t["name"]
        subject = t["subject"]
        body = t["body"]
        desc = t["description"]
        config_data = json.dumps({
            "subject": subject,
            "banner_title": t["banner_title"],
            "icon": t["icon"],
            "clinic_name": "Heal Your Heart Neelankarai",
            "clinic_address": "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar,Neelankarai, Chennai, TN 600115",
            "clinic_phone": "9003070065"
        })

        cur.execute(
            """
            INSERT INTO templates (
                name, template_type, specialty, category, description,
                content, tags, is_active, is_practice, is_library,
                created_by, owner_email, created_at, updated_at
            ) VALUES (?, 'Email', 'General Medicine', 'General Medicine', ?, ?, ?, 1, 0, 0, 'Practice Administrator', 'admin@demo.local', datetime('now'), datetime('now'))
            """,
            (name, desc, body, config_data)
        )
        template_id = cur.lastrowid

        # Insert section
        cur.execute(
            """
            INSERT INTO template_sections (
                template_id, title, category, order_index, column_layout
            ) VALUES (?, 'Email Details', 'General', 0, 1)
            """,
            (template_id,)
        )
        section_id = cur.lastrowid

        # Insert component for Subject
        cur.execute(
            """
            INSERT INTO template_components (
                section_id, component_type, label, placeholder,
                is_required, default_value, order_index, column_count, help_text, config
            ) VALUES (?, 'Text Field', 'Subject', '', 1, ?, 0, 1, 'Email Subject line', ?)
            """,
            (section_id, subject, json.dumps({"banner_title": t["banner_title"], "icon": t["icon"]}))
        )

        # Insert component for Body
        cur.execute(
            """
            INSERT INTO template_components (
                section_id, component_type, label, placeholder,
                is_required, default_value, order_index, column_count, help_text, config
            ) VALUES (?, 'Textarea', 'Email Body', '', 1, ?, 1, 1, 'Email message content with placeholders', ?)
            """,
            (section_id, body, config_data)
        )

    conn.commit()
    count = cur.execute("SELECT COUNT(*) FROM templates WHERE template_type = 'Email'").fetchone()[0]
    print(f"Successfully seeded {count} Email Templates in {db_path}!")
    conn.close()

if __name__ == "__main__":
    seed_database("backend/data/ehr.db")
    seed_database("backend/seed_data/ehr_master.db")
