export interface OnboardingFieldDef {
  key: string
  type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'number'
    | 'checkbox'
    | 'checkbox-group'
    | 'dynamic-list'
    | 'dynamic-url-list'
    | 'file'
    | 'multi-file'
  label: string
  placeholder?: string
  hint?: string
  required?: boolean
  options?: { label: string; value: string }[]
}

export interface OnboardingSectionDef {
  id: number
  title: string
  description: string
  fields: OnboardingFieldDef[]
}

function translateOptions(
  t: (key: string) => string,
  optionGroup: string,
  values: string[],
): { label: string; value: string }[] {
  return values.map((v) => ({
    label: t(`onboarding.options.${optionGroup}.${v}`),
    value: v,
  }))
}

export function useOnboardingSections(): ComputedRef<OnboardingSectionDef[]> {
  const { t } = useI18n()

  return computed(() => [
    {
      id: 0,
      title: t('onboarding.sections.0.title'),
      description: t('onboarding.sections.0.description'),
      fields: [
        {
          key: 'history',
          type: 'textarea' as const,
          label: t('onboarding.fields.history.label'),
          placeholder: t('onboarding.fields.history.placeholder'),
          required: true,
        },
        {
          key: 'motivation',
          type: 'textarea' as const,
          label: t('onboarding.fields.motivation.label'),
          placeholder: t('onboarding.fields.motivation.placeholder'),
          required: true,
        },
      ],
    },
    {
      id: 1,
      title: t('onboarding.sections.1.title'),
      description: t('onboarding.sections.1.description'),
      fields: [
        {
          key: 'therapeuticApproach',
          type: 'text' as const,
          label: t('onboarding.fields.therapeuticApproach.label'),
          placeholder: t('onboarding.fields.therapeuticApproach.placeholder'),
          required: true,
        },
        {
          key: 'methods',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.methods.label'),
          placeholder: t('onboarding.fields.methods.placeholder'),
        },
        {
          key: 'targetConditions',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.targetConditions.label'),
          placeholder: t('onboarding.fields.targetConditions.placeholder'),
        },
      ],
    },
    {
      id: 2,
      title: t('onboarding.sections.2.title'),
      description: t('onboarding.sections.2.description'),
      fields: [
        {
          key: 'idealPatientDescription',
          type: 'textarea' as const,
          label: t('onboarding.fields.idealPatientDescription.label'),
          placeholder: t('onboarding.fields.idealPatientDescription.placeholder'),
          required: true,
        },
        {
          key: 'ageRange',
          type: 'select' as const,
          label: t('onboarding.fields.ageRange.label'),
          options: translateOptions(t, 'ageRange', [
            'children',
            'teenagers',
            'young_adults',
            'adults',
            'middle_adults',
            'seniors',
          ]),
        },
        {
          key: 'concerns',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.concerns.label'),
          placeholder: t('onboarding.fields.concerns.placeholder'),
        },
      ],
    },
    {
      id: 3,
      title: t('onboarding.sections.3.title'),
      description: t('onboarding.sections.3.description'),
      fields: [
        {
          key: 'firstSessionDescription',
          type: 'textarea' as const,
          label: t('onboarding.fields.firstSessionDescription.label'),
          placeholder: t('onboarding.fields.firstSessionDescription.placeholder'),
          required: true,
        },
        {
          key: 'preparationGuide',
          type: 'textarea' as const,
          label: t('onboarding.fields.preparationGuide.label'),
          placeholder: t('onboarding.fields.preparationGuide.placeholder'),
          hint: t('onboarding.hints.preparationGuide'),
        },
        {
          key: 'expectedOutcome',
          type: 'textarea' as const,
          label: t('onboarding.fields.expectedOutcome.label'),
          placeholder: t('onboarding.fields.expectedOutcome.placeholder'),
          hint: t('onboarding.hints.expectedOutcome'),
        },
      ],
    },
    {
      id: 4,
      title: t('onboarding.sections.4.title'),
      description: t('onboarding.sections.4.description'),
      fields: [
        {
          key: 'modality',
          type: 'select' as const,
          label: t('onboarding.fields.modality.label'),
          required: true,
          options: translateOptions(t, 'modality', ['in_person', 'online', 'hybrid']),
        },
        {
          key: 'sessionDuration',
          type: 'number' as const,
          label: t('onboarding.fields.sessionDuration.label'),
          placeholder: t('onboarding.fields.sessionDuration.placeholder'),
          required: true,
        },
        {
          key: 'frequency',
          type: 'select' as const,
          label: t('onboarding.fields.frequency.label'),
          options: translateOptions(t, 'frequency', ['weekly', 'biweekly', 'monthly', 'flexible']),
        },
      ],
    },
    {
      id: 5,
      title: t('onboarding.sections.5.title'),
      description: t('onboarding.sections.5.description'),
      fields: [
        {
          key: 'address',
          type: 'text' as const,
          label: t('onboarding.fields.address.label'),
          placeholder: t('onboarding.fields.address.placeholder'),
        },
        {
          key: 'onlinePlatform',
          type: 'text' as const,
          label: t('onboarding.fields.onlinePlatform.label'),
          placeholder: t('onboarding.fields.onlinePlatform.placeholder'),
          hint: t('onboarding.hints.onlinePlatform'),
        },
        {
          key: 'languages',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.languages.label'),
          placeholder: t('onboarding.fields.languages.placeholder'),
        },
        {
          key: 'accessibility',
          type: 'checkbox-group' as const,
          label: t('onboarding.fields.accessibility.label'),
          options: translateOptions(t, 'accessibility', [
            'wheelchair',
            'elevator',
            'ground_floor',
            'accessible_bathroom',
            'near_transit',
            'parking',
          ]),
        },
      ],
    },
    {
      id: 6,
      title: t('onboarding.sections.6.title'),
      description: t('onboarding.sections.6.description'),
      fields: [
        {
          key: 'costPerSession',
          type: 'number' as const,
          label: t('onboarding.fields.costPerSession.label'),
          placeholder: t('onboarding.fields.costPerSession.placeholder'),
          hint: t('onboarding.hints.costPerSession'),
          required: true,
        },
        {
          key: 'slidingScale',
          type: 'checkbox' as const,
          label: t('onboarding.fields.slidingScale.label'),
          options: [{ label: t('onboarding.options.slidingScale.yes'), value: 'yes' }],
        },
        {
          key: 'insuranceAccepted',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.insuranceAccepted.label'),
          placeholder: t('onboarding.fields.insuranceAccepted.placeholder'),
          hint: t('onboarding.hints.insuranceAccepted'),
        },
        {
          key: 'healthFunds',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.healthFunds.label'),
          placeholder: t('onboarding.fields.healthFunds.placeholder'),
          hint: t('onboarding.hints.healthFunds'),
        },
      ],
    },
    {
      id: 7,
      title: t('onboarding.sections.7.title'),
      description: t('onboarding.sections.7.description'),
      fields: [
        {
          key: 'contactEmail',
          type: 'text' as const,
          label: t('onboarding.fields.contactEmail.label'),
          placeholder: t('onboarding.fields.contactEmail.placeholder'),
          required: true,
        },
        {
          key: 'contactPhone',
          type: 'text' as const,
          label: t('onboarding.fields.contactPhone.label'),
          placeholder: t('onboarding.fields.contactPhone.placeholder'),
        },
        {
          key: 'waitlistPolicy',
          type: 'textarea' as const,
          label: t('onboarding.fields.waitlistPolicy.label'),
          placeholder: t('onboarding.fields.waitlistPolicy.placeholder'),
          required: true,
        },
        {
          key: 'emergencyProtocol',
          type: 'textarea' as const,
          label: t('onboarding.fields.emergencyProtocol.label'),
          placeholder: t('onboarding.fields.emergencyProtocol.placeholder'),
          required: true,
        },
      ],
    },
    {
      id: 8,
      title: t('onboarding.sections.8.title'),
      description: t('onboarding.sections.8.description'),
      fields: [
        {
          key: 'toneOfVoice',
          type: 'select' as const,
          label: t('onboarding.fields.toneOfVoice.label'),
          required: true,
          options: translateOptions(t, 'toneOfVoice', [
            'warm',
            'professional',
            'empathetic',
            'direct',
            'inspiring',
            'serene',
          ]),
        },
        {
          key: 'officeAtmosphere',
          type: 'textarea' as const,
          label: t('onboarding.fields.officeAtmosphere.label'),
          placeholder: t('onboarding.fields.officeAtmosphere.placeholder'),
          required: true,
        },
        {
          key: 'coreValues',
          type: 'dynamic-list' as const,
          label: t('onboarding.fields.coreValues.label'),
          placeholder: t('onboarding.fields.coreValues.placeholder'),
          required: true,
        },
      ],
    },
    {
      id: 9,
      title: t('onboarding.sections.9.title'),
      description: t('onboarding.sections.9.description'),
      fields: [
        {
          key: 'inspirationLinks',
          type: 'dynamic-url-list' as const,
          label: t('onboarding.fields.inspirationLinks.label'),
          placeholder: t('onboarding.fields.inspirationLinks.placeholder'),
          hint: t('onboarding.hints.inspirationLinks'),
        },
        {
          key: 'whatINot',
          type: 'textarea' as const,
          label: t('onboarding.fields.whatINot.label'),
          placeholder: t('onboarding.fields.whatINot.placeholder'),
          hint: t('onboarding.hints.whatINot'),
          required: true,
        },
        {
          key: 'competitorLinks',
          type: 'dynamic-url-list' as const,
          label: t('onboarding.fields.competitorLinks.label'),
          placeholder: t('onboarding.fields.competitorLinks.placeholder'),
          hint: t('onboarding.hints.competitorLinks'),
        },
      ],
    },
    {
      id: 10,
      title: t('onboarding.sections.10.title'),
      description: t('onboarding.sections.10.description'),
      fields: [
        {
          key: 'cvFile',
          type: 'file' as const,
          label: t('onboarding.fields.cvFile.label'),
          hint: t('onboarding.hints.cvFile'),
        },
        {
          key: 'photos',
          type: 'multi-file' as const,
          label: t('onboarding.fields.photos.label'),
          hint: t('onboarding.hints.photos'),
        },
        {
          key: 'logoFile',
          type: 'file' as const,
          label: t('onboarding.fields.logoFile.label'),
          hint: t('onboarding.hints.logoFile'),
        },
      ],
    },
  ])
}
