// MVCC T30 player email → short_name map.
// This is the allowlist for the availability sign-in flow. A player's Google
// email must be in this map for them to submit availability for themselves.
// Lookups must always be lowercase — emails are case-insensitive but the map
// is keyed on lowercase strings.
//
// The admin panel still surfaces a manual-override capability for every player
// so captains can set availability on a player's behalf when needed.
export const PLAYER_EMAILS: Record<string, string> = {
  'rahulmenon614@gmail.com':           'Rahul',
  'viswakasu@gmail.com':               'Viswa',
  'sivaganesh3636@gmail.com':          'Gani',
  'yeshwanth.mutcherla@gmail.com':     'Yeswanth',
  'mahender.reddy91@gmail.com':        'Mahendra',
  'raheelrc2020@gmail.com':            'Raheel',
  'karthikbalakrishna15@gmail.com':    'Karthik',
  'rpathipatis18@gmail.com':           'Ravi',
  'rohitmaddipati@gmail.com':          'Rohith',
  'pasula.nikhilreddy6@gmail.com':     'Nikhil',
  'kousik200130@gmail.com':            'Koushik',
  'chowdary4244@gmail.com':            'Rupendra',
  'hemanth612479@gmail.com':           'Hemanth',
  'viratreddy19@gmail.com':            'Suman',
  'nithin.musku@gmail.com':            'Nithin',
  'mrushireddy2232@gmail.com':         'Rushi',
  'saran4info@gmail.com':              'Saran',
  'akshayrajrockzzz616@gmail.com':     'Akshay',
  'siddharthchawla827@gmail.com':      'Siddarth',
  'deepnuvvala@gmail.com':             'Amar',
  'ksm7692@gmail.com':                 'Manoj',
  'peddinaveenkumargoud@gmail.com':    'Naveen',
}

/**
 * Look up a player's short_name from their (case-insensitive) email.
 * Returns null if the email is not registered.
 */
export function lookupPlayerByEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return PLAYER_EMAILS[email.toLowerCase().trim()] ?? null
}

/**
 * Reverse lookup — short_name → email. Used by the admin panel to show each
 * player's email next to their availability row.
 */
export function emailForShortName(shortName: string): string | null {
  const target = shortName.toLowerCase()
  for (const [email, name] of Object.entries(PLAYER_EMAILS)) {
    if (name.toLowerCase() === target) return email
  }
  return null
}
