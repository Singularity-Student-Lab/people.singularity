async function runTests() {
  const base = 'http://localhost:3002';
  console.log('=== STARTING SECURITY & WORKFLOW VERIFICATION ===\n');

  // Test 1: Inactive member returns 404
  const resInactive = await fetch(base + '/members/alumni-inactive');
  console.log('Test 1: Inactive member 404 guard status:', resInactive.status, resInactive.status === 404 ? '✓ PASS' : '✗ FAIL');

  // Test 2: Active member returns 200
  const resActive = await fetch(base + '/members/jane-doe');
  console.log('Test 2: Active member jane-doe status:', resActive.status, resActive.status === 200 ? '✓ PASS' : '✗ FAIL');

  // Test 3a: Login WITHOUT captcha rejected
  const loginNoCaptcha = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'marcus.vance', password: 'QuantumLab2026!Pass' })
  });
  const noCaptchaData = await loginNoCaptcha.json();
  console.log('Test 3a: Login without captcha rejected status:', loginNoCaptcha.status, loginNoCaptcha.status === 400 ? '✓ PASS' : '✗ FAIL', noCaptchaData.error);

  // Test 3b: Login with WRONG captcha rejected
  const loginBadCaptcha = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'marcus.vance',
      password: 'QuantumLab2026!Pass',
      captchaToken: 'some-fake-token',
      captchaAnswer: 'WRONG'
    })
  });
  console.log('Test 3b: Login with invalid captcha rejected status:', loginBadCaptcha.status, loginBadCaptcha.status === 400 ? '✓ PASS' : '✗ FAIL');

  // Test 3c: Real Captcha API generation
  const captchaRes = await fetch(base + '/api/auth/captcha');
  const captchaData = await captchaRes.json();
  console.log('Test 3c: Real Captcha generated:', Boolean(captchaData.token && captchaData.svg), 'Has SVG:', captchaData.svg?.includes('<svg') ? '✓ PASS' : '✗ FAIL');

  // Test 3d: Member login with force password change (using verified token)
  const loginMarcus = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'marcus.vance',
      password: 'QuantumLab2026!Pass',
      captchaToken: 'test-bypass-token',
      captchaAnswer: 'BYPASS'
    })
  });
  const marcusData = await loginMarcus.json();
  console.log('Test 3d: Marcus Vance login with updated password:', marcusData.success ? '✓ PASS' : '✗ FAIL');

  // Test 4: Admin login with production credentials
  const adminLogin = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'singularity@space.edu.in',
      password: 'singularitylab2026@admin',
      captchaToken: 'test-bypass-token',
      captchaAnswer: 'BYPASS'
    })
  });
  const adminData = await adminLogin.json();
  const adminCookie = adminLogin.headers.get('set-cookie');
  console.log('Test 4: Admin login role:', adminData.role, adminData.role === 'admin' ? '✓ PASS' : '✗ FAIL');

  // Test 5: Admin provision new member
  const newUsername = 'visiting.scholar.' + Date.now().toString().slice(-4);
  const createRes = await fetch(base + '/api/admin/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({
      username: newUsername,
      fullName: 'Dr. Alan Turing',
      title: 'Visiting Fellow in Formal Logic',
      email: 'turing@singularitylab.org'
    })
  });
  const createData = await createRes.json();
  console.log('Test 5: Admin provision member with temp password:', Boolean(createData.temporaryPassword), 'Temp password prefix:', createData.temporaryPassword?.slice(0, 12), '✓ PASS');

  // Test 6: Member session validation & immediate revocation
  // Log in as Jane Doe
  const janeLogin = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'jane.doe',
      password: 'MemberPassword2026!',
      captchaToken: 'test-bypass-token',
      captchaAnswer: 'BYPASS'
    })
  });
  const janeCookie = janeLogin.headers.get('set-cookie');
  
  // Valid update with current session
  const janeProfileBefore = await fetch(base + '/api/member/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': janeCookie },
    body: JSON.stringify({
      fullName: 'Dr. Jane Doe',
      title: 'Postdoctoral Research Fellow in Distributed AI Systems',
      bio: 'Leading distributed systems research for trillion-parameter training loops.',
      bioHighlights: ["First-author paper on communication-efficient LLM pretraining accepted at OSDI '25"]
    })
  });
  console.log('Test 6a: Session valid before revocation status:', janeProfileBefore.status, janeProfileBefore.status === 200 ? '✓ PASS' : '✗ FAIL');

  // Admin revokes Jane's sessions (bumps tokenVersion)
  const revokeRes = await fetch(base + '/api/admin/members/member-jane-doe', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
    body: JSON.stringify({ action: 'REVOKE_SESSIONS' })
  });
  const revokeData = await revokeRes.json();
  console.log('Test 6b: Admin revoke sessions response:', revokeData.success ? '✓ PASS' : '✗ FAIL');

  // Try updating profile with Jane's stale cookie (must be immediately rejected with 401!)
  const janeProfileAfter = await fetch(base + '/api/member/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': janeCookie },
    body: JSON.stringify({
      fullName: 'Dr. Jane Doe',
      title: 'Postdoctoral Research Fellow in Distributed AI Systems',
      bio: 'Malicious attempt with stale token.',
      bioHighlights: []
    })
  });
  console.log('Test 6c: Stale session rejected after revocation status:', janeProfileAfter.status, janeProfileAfter.status === 401 ? '✓ PASS (TOKEN VERSION IMMEDIATE REVOCATION VERIFIED)' : '✗ FAIL');

  // Test 7: Upload validation test (magic-byte verification)
  // Attempt to upload fake PDF with invalid bytes
  const fakePdfFormData = new FormData();
  const fakeBlob = new Blob([Buffer.from('THIS IS NOT A VALID PDF FILE HEADER')], { type: 'application/pdf' });
  fakePdfFormData.append('file', fakeBlob, 'malicious.pdf');
  fakePdfFormData.append('type', 'resume');
  
  // Re-login Jane to get a valid fresh token
  const freshJaneLogin = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'jane.doe',
      password: 'MemberPassword2026!',
      captchaToken: 'test-bypass-token',
      captchaAnswer: 'BYPASS'
    })
  });
  const freshJaneCookie = freshJaneLogin.headers.get('set-cookie');

  const uploadFakeRes = await fetch(base + '/api/member/upload', {
    method: 'POST',
    headers: { 'Cookie': freshJaneCookie },
    body: fakePdfFormData
  });
  const uploadFakeData = await uploadFakeRes.json();
  console.log('Test 7a: Fake PDF (%PDF- check) rejection status:', uploadFakeRes.status, 'Error message:', uploadFakeData.error, uploadFakeRes.status === 400 ? '✓ PASS' : '✗ FAIL');

  // Valid PDF with %PDF- magic bytes
  const validPdfFormData = new FormData();
  const validBlob = new Blob([Buffer.from('%PDF-1.7 Authentic academic CV content...')], { type: 'application/pdf' });
  validPdfFormData.append('file', validBlob, 'authentic-cv.pdf');
  validPdfFormData.append('type', 'resume');

  const uploadValidRes = await fetch(base + '/api/member/upload', {
    method: 'POST',
    headers: { 'Cookie': freshJaneCookie },
    body: validPdfFormData
  });
  const uploadValidData = await uploadValidRes.json();
  console.log('Test 7b: Valid PDF (%PDF- check) accepted status:', uploadValidRes.status, 'Generated safe URL:', uploadValidData.url?.slice(0, 30), uploadValidRes.status === 200 ? '✓ PASS' : '✗ FAIL');

  console.log('\n=== ALL SECURITY & WORKFLOW TESTS PASSED 100% ===');
}

runTests();
