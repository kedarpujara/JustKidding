-- Default pediatric intake template
INSERT INTO intake_templates (name, specialty, version, schema, is_active) VALUES
('General Pediatric Intake', NULL, 1, '{
  "sections": [
    {
      "id": "reason",
      "title": "Reason for Visit",
      "questions": [
        {
          "id": "chief_complaint",
          "type": "select",
          "label": "What is the main reason for this visit?",
          "required": true,
          "options": [
            {"value": "fever", "label": "Fever"},
            {"value": "cough_cold", "label": "Cough/Cold"},
            {"value": "stomach_issues", "label": "Stomach Issues"},
            {"value": "skin_rash", "label": "Skin Rash"},
            {"value": "ear_pain", "label": "Ear Pain"},
            {"value": "injury", "label": "Injury"},
            {"value": "growth_concern", "label": "Growth Concern"},
            {"value": "vaccination", "label": "Vaccination"},
            {"value": "follow_up", "label": "Follow-up Visit"},
            {"value": "other", "label": "Other"}
          ]
        },
        {
          "id": "complaint_details",
          "type": "text",
          "label": "Please describe the symptoms in detail",
          "required": true,
          "placeholder": "Describe what you''ve noticed..."
        }
      ]
    },
    {
      "id": "symptoms",
      "title": "Symptoms",
      "questions": [
        {
          "id": "symptom_duration",
          "type": "select",
          "label": "How long has your child had these symptoms?",
          "required": true,
          "options": [
            {"value": "today", "label": "Started today"},
            {"value": "1-2_days", "label": "1-2 days"},
            {"value": "3-5_days", "label": "3-5 days"},
            {"value": "1_week", "label": "About a week"},
            {"value": "2_weeks", "label": "About 2 weeks"},
            {"value": "more", "label": "More than 2 weeks"}
          ]
        },
        {
          "id": "severity",
          "type": "scale",
          "label": "How severe are the symptoms?",
          "required": true,
          "min": 1,
          "max": 10
        },
        {
          "id": "getting_worse",
          "type": "boolean",
          "label": "Are the symptoms getting worse?",
          "required": true
        }
      ]
    },
    {
      "id": "vitals",
      "title": "Vitals (if available)",
      "description": "These help the doctor but are not required",
      "questions": [
        {
          "id": "temperature",
          "type": "number",
          "label": "Temperature (°F)",
          "required": false,
          "unit": "°F",
          "min": 95,
          "max": 108,
          "conditions": [
            {"questionId": "chief_complaint", "operator": "equals", "value": "fever"}
          ]
        },
        {
          "id": "weight",
          "type": "number",
          "label": "Weight (kg)",
          "required": false,
          "unit": "kg",
          "min": 1,
          "max": 100
        },
        {
          "id": "height",
          "type": "number",
          "label": "Height (cm)",
          "required": false,
          "unit": "cm",
          "min": 30,
          "max": 200
        },
        {
          "id": "spo2",
          "type": "number",
          "label": "Oxygen Saturation (SpO₂)",
          "required": false,
          "unit": "%",
          "min": 70,
          "max": 100,
          "conditions": [
            {"questionId": "chief_complaint", "operator": "equals", "value": "cough_cold"}
          ]
        }
      ]
    },
    {
      "id": "history",
      "title": "Medical History",
      "questions": [
        {
          "id": "tried_medications",
          "type": "boolean",
          "label": "Have you given any medications for this issue?",
          "required": true
        },
        {
          "id": "medications_given",
          "type": "text",
          "label": "What medications were given?",
          "required": false,
          "conditions": [
            {"questionId": "tried_medications", "operator": "equals", "value": true}
          ]
        },
        {
          "id": "seen_doctor",
          "type": "boolean",
          "label": "Has a doctor been consulted for this issue before?",
          "required": true
        },
        {
          "id": "additional_notes",
          "type": "text",
          "label": "Any additional information you want to share?",
          "required": false,
          "placeholder": "Recent travel, exposure to sick individuals, etc."
        }
      ]
    }
  ]
}'::jsonb, true);

-- Respiratory-specific intake template
INSERT INTO intake_templates (name, specialty, version, schema, is_active) VALUES
('Respiratory Symptoms Intake', 'Pulmonology', 1, '{
  "sections": [
    {
      "id": "respiratory_symptoms",
      "title": "Breathing Symptoms",
      "questions": [
        {
          "id": "breathing_difficulty",
          "type": "select",
          "label": "Is there any difficulty breathing?",
          "required": true,
          "options": [
            {"value": "none", "label": "No difficulty"},
            {"value": "mild", "label": "Mild - only during activity"},
            {"value": "moderate", "label": "Moderate - noticeable at rest"},
            {"value": "severe", "label": "Severe - struggling to breathe"}
          ]
        },
        {
          "id": "cough_type",
          "type": "select",
          "label": "What type of cough?",
          "required": true,
          "options": [
            {"value": "dry", "label": "Dry cough"},
            {"value": "wet", "label": "Wet/productive cough"},
            {"value": "barking", "label": "Barking cough"},
            {"value": "wheezing", "label": "Wheezing"},
            {"value": "none", "label": "No cough"}
          ]
        },
        {
          "id": "spo2",
          "type": "number",
          "label": "Oxygen Saturation (SpO₂) if available",
          "required": false,
          "unit": "%",
          "min": 70,
          "max": 100
        }
      ]
    }
  ]
}'::jsonb, true);
