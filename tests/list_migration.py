"""Browser regression checks. Run: python3 tests/list_migration.py

Requires Playwright for Python and Chromium. All API calls are mocked; these
checks never submit a real record or require production credentials.
"""
import json
import mimetypes
from pathlib import Path
import shutil
from urllib.parse import urlsplit
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://list.test'


class ListMigration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=shutil.which('chromium'), args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.requests = []
        self.record_reply = (200, {'ok': True})
        self.level_reply = (200, {'ok': True})
        self.account_failure = False
        self.page.add_init_script("""
            if (!sessionStorage.getItem('test-initialized')) {
                localStorage.setItem('userToken', 'initial-token');
                sessionStorage.setItem('test-initialized', 'true');
            }
            window.notifications = [];
            window.toastr = Object.fromEntries(['success', 'warning', 'error'].map(
                kind => [kind, message => notifications.push({kind, message})]));
            window.trianglify = Object.assign(() => ({
                toCanvas: () => document.createElement('canvas')
            }), {colorFunctions: {interpolateLinear: () => null}});
        """)
        self.context.route('**/*', self.route)

    def tearDown(self):
        self.context.close()

    def route(self, route):
        request = route.request
        parsed = urlsplit(request.url)
        if parsed.netloc != 'list.test':
            route.abort()
            return
        self.requests.append(request)
        path = parsed.path.removeprefix('/list')
        status, payload = 200, None
        if path == '/rest/mainlist':
            payload = [{'id': '123', 'title': 'Test level', 'creator': 'Creator',
                        'ranking': 1, 'link': 'https://youtu.be/abcdefghijk'}]
        elif path == '/get-gdusername':
            if self.account_failure:
                route.fulfill(status=502, content_type='text/html', body='<h1>Bad gateway</h1>')
                return
            payload = {'gdusername': 'Player'}
        elif path == '/validateUsername':
            payload = {'isValid': True, 'errorMessage': ''}
        elif path == '/rest/add-record':
            if self.record_reply is None:
                route.abort()
                return
            status, payload = self.record_reply
            if isinstance(payload, str):
                route.fulfill(status=status, content_type='text/html', body=payload)
                return
        elif path == '/rest/add-level':
            if self.level_reply is None:
                route.abort()
                return
            status, payload = self.level_reply
        elif path in ['/rest/sign-in', '/rest/sign-up']:
            payload = {'token': 'signed-in-token'}
        elif path == '/rest/validateUser':
            payload = {'username': 'User'}
        elif path.startswith('/rest/'):
            payload = []
        if payload is not None:
            route.fulfill(status=status, content_type='application/json', body=json.dumps(payload))
            return
        file = ROOT / path.lstrip('/')
        if file.is_file():
            mime = 'text/javascript' if file.suffix == '.js' else mimetypes.guess_type(file)[0]
            route.fulfill(content_type=mime or 'application/octet-stream', body=file.read_bytes())
        else:
            route.fulfill(status=404, body='Not found')

    def open_record(self, mount='/list'):
        self.page.goto(f'{ORIGIN}{mount}/record_submission_form.html?levelId=123')
        self.page.wait_for_function("document.querySelector('#levelDropdown').value === '123'")
        self.page.locator('#youtubeLinkRecord').fill('https://youtu.be/abcdefghijk')

    def submit(self):
        self.page.evaluate("notifications.length = 0")
        self.page.locator('#recordForm').dispatch_event('submit')
        self.page.wait_for_function('notifications.length > 0 && !document.querySelector("#submitButton").disabled')
        self.assertEqual(self.page.locator('#loader').evaluate('el => el.style.display'), 'none')
        return self.page.evaluate('notifications.at(-1)')

    def test_submission_uses_mount_path_and_current_token(self):
        for mount in ['/list', '']:
            with self.subTest(mount=mount):
                self.open_record(mount)
                self.page.evaluate("localStorage.setItem('userToken', 'fresh-token')")
                self.assertEqual(self.submit()['kind'], 'success')
                post = [r for r in self.requests if r.method == 'POST'][-1]
                self.assertEqual(urlsplit(post.url).path, f'{mount}/rest/add-record')
                self.assertEqual(post.headers['authorization'], 'Bearer fresh-token')

    def test_submission_errors_are_actionable_and_retryable(self):
        self.open_record()
        for reply, text in [
            ((400, {'error': 2}), 'sign in again'),
            ((400, {'error': 3}), 'sign in again'),
            ((401, {}), 'sign in again'),
            ((403, {}), 'sign in again'),
            ((409, {'error': 'Record already exists'}), 'Record already exists'),
            ((400, {'error': 'Invalid YouTube link'}), 'Invalid YouTube link'),
            ((503, {'message': 'Please retry later'}), 'Please retry later'),
            ((502, '<h1>Bad gateway</h1>'), 'HTTP 502'),
            (None, 'Could not reach'),
        ]:
            with self.subTest(reply=reply):
                self.record_reply = reply
                self.assertIn(text, self.submit()['message'])

    def test_logged_out_and_invalid_percentages_do_not_submit(self):
        self.open_record()
        for percentage in ['59', '101', '60.5']:
            self.page.locator('#percentage').fill(percentage)
            self.assertIn('required fields', self.submit()['message'])
        self.page.locator('#percentage').fill('100')
        self.page.evaluate("localStorage.removeItem('userToken')")
        self.assertIn('sign in', self.submit()['message'])
        self.assertFalse(any(r.method == 'POST' for r in self.requests))

    def test_account_failure_does_not_prevent_loading_levels(self):
        self.account_failure = True
        self.open_record()
        self.page.locator('#playerName').fill('Player')
        self.assertEqual(self.submit()['kind'], 'success')

    def test_api_errors_are_escaped(self):
        self.record_reply = (400, {'error': '<img src=x onerror=alert(1)>'})
        self.open_record()
        self.assertIn('&lt;img', self.submit()['message'])

    def test_sign_in_returns_to_list(self):
        self.page.goto(f'{ORIGIN}/list/signin.html')
        self.page.locator('#username').fill('User')
        self.page.locator('#password').fill('test-password')
        self.page.locator('#signInForm').dispatch_event('submit')
        self.page.wait_for_url(f'{ORIGIN}/list/index.html')
        post = [r for r in self.requests if r.method == 'POST'][-1]
        self.assertEqual(urlsplit(post.url).path, '/list/rest/sign-in')

    def test_sign_up_returns_to_list(self):
        self.page.goto(f'{ORIGIN}/list/signup.html')
        self.page.locator('#username').fill('User')
        self.page.locator('#password').fill('test-password')
        self.page.locator('#confirmPassword').fill('test-password')
        self.page.evaluate("document.querySelector('.frc-captcha').innerHTML = '<input value=mock-solution>'")
        self.page.locator('#signUpForm').dispatch_event('submit')
        self.page.wait_for_url(f'{ORIGIN}/list/index.html')
        post = [r for r in self.requests if r.method == 'POST'][-1]
        self.assertEqual(urlsplit(post.url).path, '/list/rest/sign-up')

    def test_sign_out_returns_to_list(self):
        self.page.goto(f'{ORIGIN}/list/account.html')
        self.page.locator('#logoutBtn').dispatch_event('click')
        self.page.wait_for_url(f'{ORIGIN}/list/index.html')
        self.assertIsNone(self.page.evaluate("localStorage.getItem('userToken')"))

    def test_level_submission_failure_allows_retry(self):
        self.page.goto(f'{ORIGIN}/list/level_submission_form.html')
        self.page.evaluate("""() => {
            for (const [id, value] of Object.entries({levelId: '456', levelName: 'Level',
                verifier: 'Verifier', creator: 'Creator', youtubeLink: 'https://youtu.be/abcdefghijk'})) {
                document.getElementById(id).value = value;
            }
            document.getElementById('lengthIcon').innerHTML = '<i class=tick-icon></i>';
        }""")
        for reply, text in [(None, 'Could not reach'), ((503, {'error': 'Please try again'}), 'Please try again')]:
            with self.subTest(reply=reply):
                self.level_reply = reply
                self.page.evaluate('notifications.length = 0')
                self.page.locator('#levelForm').dispatch_event('submit')
                self.page.wait_for_function('notifications.length > 0 && !document.querySelector("#submitButton").disabled')
                self.assertIn(text, self.page.evaluate('notifications.at(-1).message'))

    def test_navigation_and_scripts_keep_list_prefix(self):
        for file in ROOT.glob('*.html'):
            if file.name in ['map.html', '404.html']:
                continue
            with self.subTest(page=file.name):
                self.page.goto(f'{ORIGIN}/list/{file.name}')
                urls = self.page.locator('a[href],script[src],link[href],img[src]').evaluate_all(
                    "els => els.map(el => el.href || el.src).filter(url => url.startsWith(location.origin))")
                self.assertTrue(all(url.startswith(f'{ORIGIN}/list/') for url in urls), urls)
                for code in self.page.locator('[onclick]').evaluate_all("els => els.map(el => el.getAttribute('onclick'))"):
                    self.assertNotIn("href='/", code)


if __name__ == '__main__':
    unittest.main(verbosity=2)
