#define NOMINMAX
#include <new>
#include "HolyQuickPanel.h"

#ifdef AE_OS_WIN
#include <windows.h>
#include <windowsx.h>
#include <shlobj.h>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <gdiplus.h>
#include "resource.h"
#include "json.hpp"
#endif

// ----------------------------------------------------------------------------
// Holy Quick Panel — native popup.
//
// Borderless rounded popup at cursor showing the active bank's 3 snippets as
// owner-drawn buttons. Clicking a button applies that snippet's expression to
// the user's selected property via AEGP_ExecuteScript. Click outside / Esc
// dismisses. Header shows the bank name, a shield badge, and a right-side
// cluster of icon affordances (controls indicator, load-controls checkbox,
// divider, snippet manager) matching the CEP reference. Typography: Dosis,
// embedded as a Win32 font resource in the .aex.
//
// The right-cluster icons are currently visual only — clicks don't toggle
// the checkbox or launch the snippet manager yet. That's wired in a later
// pass.
// ----------------------------------------------------------------------------

using nlohmann::json;

static const wchar_t* kHQP_WndClass = L"HolyQuickPanelPopup";
static HWND            g_popupHwnd   = NULL;
static HHOOK           g_mouseHook   = NULL;
static HFONT           g_fontBody    = NULL;
static HFONT           g_fontHeader  = NULL;
static HINSTANCE       g_hAexInstance = NULL;
static HANDLE          g_hFontResource = NULL;
static ULONG_PTR       g_gdipToken   = 0;

static const COLORREF kBgColor       = RGB(28, 29, 34);
static const COLORREF kBorderColor   = RGB(0x7c, 0x6c, 0xfa);   // --G-color-1
static const COLORREF kAccentColor   = RGB(0x7c, 0x6c, 0xfa);
static const COLORREF kAccentDim     = RGB(0x54, 0x49, 0xb8);   // muted accent for dividers
static const COLORREF kTextColor     = RGB(210, 210, 218);
static const COLORREF kTextBright    = RGB(235, 235, 242);
static const COLORREF kTextMuted     = RGB(155, 155, 165);
static const COLORREF kTextDim       = RGB(110, 110, 120);
static const COLORREF kBtnBg         = RGB(30, 31, 37);
static const COLORREF kBtnBgPressed  = RGB(54, 50, 88);
static const COLORREF kDividerGrey   = RGB(58, 58, 68);

// Layout
static const int W         = 400;
static const int H         = 110;
static const int M         = 10;
static const int HDR_H     = 32;
static const int BTN_Y     = M + HDR_H + 4;
static const int BTN_H     = 50;
static const int CORNER_R  = 8;
static const int BTN_W     = (W - 2 * M) / 3;

// Header layout (within y = M .. M + HDR_H)
static const int HDR_SHIELD_W    = 14;
static const int HDR_SHIELD_H    = 16;
static const int HDR_TEXT_X      = M + HDR_SHIELD_W + 8;  // text starts after shield + gap
static const int HDR_CLUSTER_GAP = 6;
static const int ICON_CTRL_W     = 22;   // controls indicator
static const int ICON_CBOX_W     = 14;   // diamond/circle checkbox
static const int ICON_DIV_W      = 1;    // cluster divider
static const int ICON_MGR_W      = 22;   // snippet manager
static const int CLUSTER_W =
    ICON_CTRL_W + 4 + ICON_CBOX_W + HDR_CLUSTER_GAP + ICON_DIV_W + HDR_CLUSTER_GAP + ICON_MGR_W;

static const int kBtnIds[3] = { 1001, 1002, 1003 };

struct Snippet { std::wstring name; std::wstring expr; std::wstring id; };
static std::wstring            g_bankName;
static std::vector<Snippet>    g_snippets;
static HWND                    g_buttons[3] = { NULL, NULL, NULL };

// Load-controls checkbox state — persisted to quickpanel.json.
static bool                    g_loadControlsOn = false;

// All banks from banks.json — used by the shield bank-switcher popup menu.
struct BankInfo { int id; std::wstring name; };
static std::vector<BankInfo>   g_allBanks;
static int                     g_activeBankId = 0;

// Transient status message shown in the header after apply, before dismiss.
static std::wstring            g_statusMsg;
static const UINT              kStatusTimerId = 1;

// Right-cluster icon rects. Shared between WM_PAINT (drawing) and
// WM_LBUTTONDOWN / WM_SETCURSOR (hit-testing). Populated by GetClusterRects.
struct ClusterRects {
    RECT ctrl;    // controls indicator (not interactive)
    RECT cbox;    // load-controls checkbox
    RECT divider; // vertical divider (not interactive)
    RECT mgr;     // snippet manager
};

static ClusterRects GetClusterRects()
{
    ClusterRects cr;
    int clusterRight = W - M;
    int mgrX  = clusterRight - ICON_MGR_W;
    int divX  = mgrX - HDR_CLUSTER_GAP - ICON_DIV_W;
    int cboxX = divX - HDR_CLUSTER_GAP - ICON_CBOX_W;
    int ctlX  = cboxX - 4 - ICON_CTRL_W;

    int yCtrl = M + (HDR_H - 11) / 2;
    int yCbox = M + (HDR_H - 14) / 2;
    int yMgr  = M + (HDR_H - 10) / 2;

    cr.ctrl    = { ctlX,  yCtrl, ctlX  + ICON_CTRL_W, yCtrl + 11 };
    cr.cbox    = { cboxX, yCbox, cboxX + ICON_CBOX_W, yCbox + 14 };
    cr.divider = { divX,  M + 6, divX  + ICON_DIV_W,  M + HDR_H - 6 };
    cr.mgr     = { mgrX,  yMgr,  mgrX  + ICON_MGR_W,  yMgr  + 10 };
    return cr;
}

// Inflate a RECT for easier click-targeting. Icons are small; give a few
// pixels of slop in each direction so the user doesn't have to aim.
static RECT InflateForHit(const RECT& r, int pad)
{
    return { r.left - pad, r.top - pad, r.right + pad, r.bottom + pad };
}

// ----------------------------------------------------------------------------
// DllMain — capture our own HINSTANCE for resource loading.
// ----------------------------------------------------------------------------

BOOL WINAPI DllMain(HINSTANCE hInst, DWORD reason, LPVOID /*reserved*/)
{
    if (reason == DLL_PROCESS_ATTACH) {
        g_hAexInstance = hInst;
    }
    return TRUE;
}

// ----------------------------------------------------------------------------
// Helpers — UTF-8, banks.json path, GDI+/font lifecycle.
// ----------------------------------------------------------------------------

static std::wstring Utf8ToWide(const std::string& s)
{
    if (s.empty()) return L"";
    int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), NULL, 0);
    std::wstring out((size_t)n, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), &out[0], n);
    return out;
}

static std::wstring GetBanksJsonPath()
{
    PWSTR roaming = NULL;
    std::wstring path;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &roaming))) {
        path = roaming;
        path += L"\\HolyExpressor\\banks.json";
        CoTaskMemFree(roaming);
    }
    return path;
}

static std::wstring GetQuickPanelJsonPath()
{
    PWSTR roaming = NULL;
    std::wstring path;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &roaming))) {
        path = roaming;
        path += L"\\HolyExpressor\\quickpanel.json";
        CoTaskMemFree(roaming);
    }
    return path;
}

static json ReadQuickPanelJson()
{
    std::wstring path = GetQuickPanelJsonPath();
    if (path.empty()) return json::object();
    std::ifstream f(path);
    if (!f.is_open()) return json::object();
    std::stringstream ss;
    ss << f.rdbuf();
    try { return json::parse(ss.str()); }
    catch (...) { return json::object(); }
}

static void WriteQuickPanelJson(const json& data)
{
    std::wstring path = GetQuickPanelJsonPath();
    if (path.empty()) return;
    std::ofstream f(path);
    if (f.is_open()) f << data.dump(2);
}

// Overwrite only the activeBankId key inside banks.json, preserving all other data.
static void WriteActiveBankId(int id)
{
    std::wstring wpath = GetBanksJsonPath();
    if (wpath.empty()) return;
    std::ifstream fi(wpath);
    if (!fi.is_open()) return;
    std::stringstream ss;
    ss << fi.rdbuf();
    fi.close();
    try {
        json data = json::parse(ss.str());
        data["activeBankId"] = id;
        std::ofstream fo(wpath);
        if (fo.is_open()) fo << data.dump(2);
    } catch (...) {}
}

static bool LoadBanks()
{
    g_snippets.clear();
    g_bankName.clear();
    g_allBanks.clear();

    std::wstring wpath = GetBanksJsonPath();
    if (wpath.empty()) return false;

    std::ifstream f(wpath);
    if (!f.is_open()) return false;

    std::stringstream ss;
    ss << f.rdbuf();
    std::string text = ss.str();
    if (text.empty()) return false;

    try {
        json data = json::parse(text);
        int activeId = data.value("activeBankId", 0);
        g_activeBankId = activeId;

        if (!data.contains("banks") || !data["banks"].is_array() || data["banks"].empty()) {
            return false;
        }

        // Build all-banks list for the shield bank-switcher menu.
        for (const auto& b : data["banks"]) {
            if (b.contains("id") && b["id"].is_number_integer() &&
                b.contains("name") && b["name"].is_string()) {
                BankInfo bi;
                bi.id   = b["id"].get<int>();
                bi.name = Utf8ToWide(b["name"].get<std::string>());
                g_allBanks.push_back(bi);
            }
        }

        const json* active = NULL;
        for (const auto& b : data["banks"]) {
            if (b.contains("id") && b["id"].is_number_integer() &&
                b["id"].get<int>() == activeId) {
                active = &b;
                break;
            }
        }
        if (!active) active = &data["banks"][0];

        g_bankName = Utf8ToWide(active->value("name", std::string("Bank")));

        if (active->contains("snippets") && (*active)["snippets"].is_array()) {
            for (const auto& s : (*active)["snippets"]) {
                Snippet sn;
                sn.name = Utf8ToWide(s.value("name", std::string("")));
                sn.expr = Utf8ToWide(s.value("expr", std::string("")));
                if (s.contains("id")) {
                    if (s["id"].is_number_integer())
                        sn.id = std::to_wstring(s["id"].get<int>());
                    else if (s["id"].is_string())
                        sn.id = Utf8ToWide(s["id"].get<std::string>());
                }
                g_snippets.push_back(sn);
                if (g_snippets.size() >= 3) break;
            }
        }
        return true;
    }
    catch (...) {
        return false;
    }
}

static void HQP_EnsureGdipStarted()
{
    static bool started = false;
    if (started) return;
    started = true;
    Gdiplus::GdiplusStartupInput input;
    Gdiplus::GdiplusStartup(&g_gdipToken, &input, NULL);
}

// Load the embedded Dosis TTF into the process font table via
// AddFontMemResourceEx. Silent on failure — CreateFontW will fall back to a
// system default if "Dosis" is unavailable.
static void HQP_EnsureFontLoaded()
{
    static bool tried = false;
    if (tried) return;
    tried = true;

    if (!g_hAexInstance) return;

    HRSRC hRes = FindResourceW(g_hAexInstance, MAKEINTRESOURCEW(IDR_FONT_DOSIS), MAKEINTRESOURCEW(10));  // 10 = RT_RCDATA
    if (!hRes) return;
    HGLOBAL hData = LoadResource(g_hAexInstance, hRes);
    if (!hData) return;
    void* pData = LockResource(hData);
    DWORD size = SizeofResource(g_hAexInstance, hRes);
    if (!pData || size == 0) return;

    DWORD numFonts = 0;
    g_hFontResource = AddFontMemResourceEx(pData, size, NULL, &numFonts);
}

static HFONT GetBodyFont()
{
    if (!g_fontBody) {
        HQP_EnsureFontLoaded();
        g_fontBody = CreateFontW(
            15, 0, 0, 0, FW_MEDIUM, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
            CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE,
            L"Dosis");
    }
    return g_fontBody;
}

static HFONT GetHeaderFont()
{
    if (!g_fontHeader) {
        HQP_EnsureFontLoaded();
        g_fontHeader = CreateFontW(
            17, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
            DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
            CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE,
            L"Dosis");
    }
    return g_fontHeader;
}

// ----------------------------------------------------------------------------
// Icon drawing — GDI+ for smooth anti-aliased lines. Each helper draws at
// the target rect using the SVG viewBox as source coordinates.
// ----------------------------------------------------------------------------

static inline Gdiplus::Color AccentGdip(BYTE a = 255) {
    return Gdiplus::Color(a, 0x7c, 0x6c, 0xfa);
}

static void DrawShieldBadge(Gdiplus::Graphics& gfx, float cx, float cy)
{
    using namespace Gdiplus;
    // Badge shape: rounded top, tapered bottom point. Approximation of the
    // SVG path at index.html:262–272. Keeps the visual weight without trying
    // to Bezier-fit at small sizes.
    float w = (float)HDR_SHIELD_W;
    float h = (float)HDR_SHIELD_H;
    float left = cx - w * 0.5f;
    float top  = cy - h * 0.5f;
    float r    = 3.0f;

    GraphicsPath path;
    path.AddArc(left, top, r * 2, r * 2, 180.0f, 90.0f);                       // TL
    path.AddArc(left + w - r * 2, top, r * 2, r * 2, 270.0f, 90.0f);           // TR
    path.AddLine(left + w, top + r, left + w, top + h * 0.58f);                // right edge
    path.AddLine(left + w, top + h * 0.58f, left + w * 0.5f, top + h);         // taper-in R
    path.AddLine(left + w * 0.5f, top + h, left, top + h * 0.58f);             // taper-in L
    path.AddLine(left, top + h * 0.58f, left, top + r);                        // left edge
    path.CloseFigure();

    SolidBrush fill(AccentGdip());
    gfx.FillPath(&fill, &path);
}

static void DrawControlsIndicator(Gdiplus::Graphics& gfx, float x, float y)
{
    using namespace Gdiplus;
    // Source viewBox 28.63 x 14.32 → render into ICON_CTRL_W x ~11 px.
    const float vw = 28.63f;
    const float vh = 14.32f;
    const float dw = (float)ICON_CTRL_W;
    const float dh = 11.0f;
    const float sx = dw / vw;
    const float sy = dh / vh;

    Color bodyC(255, (BYTE)GetRValue(kTextColor), (BYTE)GetGValue(kTextColor), (BYTE)GetBValue(kTextColor));
    Pen   pen(bodyC, 1.3f);
    pen.SetStartCap(LineCapRound);
    pen.SetEndCap(LineCapRound);
    SolidBrush br(bodyC);

    // Filled circle at (7.14, 7.19), r=2.49
    float rx = 2.2f * sx;
    float ry = 2.2f * sy;
    gfx.FillEllipse(&br, x + 7.14f * sx - rx, y + 7.19f * sy - ry, rx * 2, ry * 2);

    // Short diagonals
    gfx.DrawLine(&pen, x + 13.26f * sx, y + 13.29f * sy, x + 11.15f * sx, y + 11.17f * sy);
    gfx.DrawLine(&pen, x + 3.12f  * sx, y + 3.14f  * sy, x + 1.00f  * sx, y + 1.03f  * sy);

    // Polyline (9.65,1) → (16.37,7.72) → (16.37,2.05) → (27.63,13.32)
    PointF pts[4] = {
        { x + 9.65f  * sx, y + 1.00f  * sy },
        { x + 16.37f * sx, y + 7.72f  * sy },
        { x + 16.37f * sx, y + 2.05f  * sy },
        { x + 27.63f * sx, y + 13.32f * sy }
    };
    gfx.DrawLines(&pen, pts, 4);
}

static void DrawCheckboxDiamond(Gdiplus::Graphics& gfx, float x, float y, bool checked)
{
    using namespace Gdiplus;
    // 14x14 — outer circle r=5.5, inner dot r=3 when checked.
    Color strokeC(checked ? AccentGdip()
                          : Color(255, (BYTE)GetRValue(kTextMuted),
                                        (BYTE)GetGValue(kTextMuted),
                                        (BYTE)GetBValue(kTextMuted)));
    Pen pen(strokeC, 1.4f);
    gfx.DrawEllipse(&pen, x + 1.5f, y + 1.5f, 11.0f, 11.0f);
    if (checked) {
        SolidBrush br(AccentGdip());
        gfx.FillEllipse(&br, x + 4.0f, y + 4.0f, 6.0f, 6.0f);
    }
}

static void DrawSnippetMgrIcon(Gdiplus::Graphics& gfx, float x, float y)
{
    using namespace Gdiplus;
    // Source viewBox 33.73 x 16.26 → render into ICON_MGR_W x 10 px.
    const float vw = 33.73f;
    const float vh = 16.26f;
    const float dw = (float)ICON_MGR_W;
    const float dh = 10.0f;
    const float sx = dw / vw;
    const float sy = dh / vh;

    Pen pen(AccentGdip(), 1.9f);
    pen.SetStartCap(LineCapRound);
    pen.SetEndCap(LineCapRound);

    const float lines[3][4] = {
        { 31.73f, 14.26f, 19.47f, 2.0f },
        { 22.99f, 14.26f, 10.73f, 2.0f },
        { 14.26f, 14.26f,  2.00f, 2.0f }
    };
    for (int i = 0; i < 3; i++) {
        gfx.DrawLine(&pen,
            x + lines[i][0] * sx, y + lines[i][1] * sy,
            x + lines[i][2] * sx, y + lines[i][3] * sy);
    }
}

// ----------------------------------------------------------------------------
// Apply plumbing
// ----------------------------------------------------------------------------

class HolyQuickPanel;
static HolyQuickPanel* g_instance = nullptr;

static std::string EscapeJsString(const std::wstring& ws)
{
    std::string utf8;
    if (!ws.empty()) {
        int n = WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), (int)ws.size(),
                                    NULL, 0, NULL, NULL);
        if (n > 0) {
            utf8.resize((size_t)n);
            WideCharToMultiByte(CP_UTF8, 0, ws.c_str(), (int)ws.size(),
                                &utf8[0], n, NULL, NULL);
        }
    }

    std::string out;
    out.reserve(utf8.size() + 8);
    for (size_t i = 0; i < utf8.size(); i++) {
        unsigned char c = (unsigned char)utf8[i];
        switch (c) {
            case '\\': out += "\\\\"; break;
            case '"':  out += "\\\""; break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:
                if (c < 0x20) {
                    char buf[16];
                    wsprintfA(buf, "\\u%04x", (unsigned int)c);
                    out += buf;
                } else {
                    out += (char)c;
                }
                break;
        }
    }
    return out;
}

static void HQP_ApplySnippetExpression(const std::wstring& expr,
                                       const std::wstring& snippetId);

// ----------------------------------------------------------------------------
// Outside-click dismiss via low-level mouse hook.
// ----------------------------------------------------------------------------

static LRESULT CALLBACK HQP_MouseHook(int nCode, WPARAM wp, LPARAM lp)
{
    if (nCode == HC_ACTION &&
        (wp == WM_LBUTTONDOWN || wp == WM_RBUTTONDOWN || wp == WM_MBUTTONDOWN)) {
        if (g_popupHwnd && IsWindow(g_popupHwnd)) {
            MSLLHOOKSTRUCT* m = (MSLLHOOKSTRUCT*)lp;
            RECT rc;
            GetWindowRect(g_popupHwnd, &rc);
            if (!PtInRect(&rc, m->pt)) {
                PostMessage(g_popupHwnd, WM_CLOSE, 0, 0);
            }
        }
    }
    return CallNextHookEx(g_mouseHook, nCode, wp, lp);
}

// ----------------------------------------------------------------------------
// WndProc
// ----------------------------------------------------------------------------

static LRESULT CALLBACK HQP_WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
    switch (msg) {
        case WM_KEYDOWN:
            if (wp == VK_ESCAPE) {
                DestroyWindow(hwnd);
                return 0;
            }
            break;

        case WM_COMMAND: {
            WORD id = LOWORD(wp);
            for (int i = 0; i < 3; i++) {
                if (id == (WORD)kBtnIds[i]) {
                    if (i < (int)g_snippets.size()) {
                        HQP_ApplySnippetExpression(g_snippets[i].expr, g_snippets[i].id);
                        g_statusMsg = L"APPLIED!";
                        InvalidateRect(hwnd, NULL, FALSE);
                        SetTimer(hwnd, kStatusTimerId, 350, NULL);
                    } else {
                        DestroyWindow(hwnd);
                    }
                    return 0;
                }
            }
            break;
        }

        case WM_TIMER:
            if (wp == kStatusTimerId) {
                KillTimer(hwnd, kStatusTimerId);
                DestroyWindow(hwnd);
            }
            return 0;

        case WM_DRAWITEM: {
            LPDRAWITEMSTRUCT dis = (LPDRAWITEMSTRUCT)lp;
            if (dis->CtlType != ODT_BUTTON) break;

            int idx = -1;
            for (int i = 0; i < 3; i++) {
                if (dis->CtlID == (UINT)kBtnIds[i]) { idx = i; break; }
            }

            bool pressed = (dis->itemState & ODS_SELECTED) != 0;
            bool hasSnip = (idx >= 0 && idx < (int)g_snippets.size() &&
                            !g_snippets[idx].name.empty());

            // Background — subtle accent tint when pressed, flat otherwise.
            HBRUSH bg = CreateSolidBrush(pressed ? kBtnBgPressed : kBtnBg);
            FillRect(dis->hDC, &dis->rcItem, bg);
            DeleteObject(bg);

            // 1px subtle grey vertical divider at the left edge of buttons 2 & 3.
            if (idx > 0) {
                RECT div = dis->rcItem;
                div.right = div.left + 1;
                HBRUSH dBr = CreateSolidBrush(kDividerGrey);
                FillRect(dis->hDC, &div, dBr);
                DeleteObject(dBr);
            }

            SetBkMode(dis->hDC, TRANSPARENT);
            SetTextColor(dis->hDC, hasSnip ? kTextColor : kTextDim);
            HFONT oldFont = (HFONT)SelectObject(dis->hDC, GetBodyFont());

            // Uppercase at draw time (do not mutate storage).
            wchar_t labelBuf[256];
            if (hasSnip) {
                lstrcpynW(labelBuf, g_snippets[idx].name.c_str(), 256);
            } else {
                lstrcpynW(labelBuf, L"-", 256);
            }
            CharUpperBuffW(labelBuf, (DWORD)lstrlenW(labelBuf));

            RECT r = dis->rcItem;
            r.left += 6; r.right -= 6;
            DrawTextW(dis->hDC, labelBuf, -1, &r,
                      DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);

            SelectObject(dis->hDC, oldFont);
            return TRUE;
        }

        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            RECT rc;
            GetClientRect(hwnd, &rc);

            // Flat bg (clipped by the window region to the rounded shape).
            HBRUSH bg = CreateSolidBrush(kBgColor);
            FillRect(hdc, &rc, bg);
            DeleteObject(bg);

            HQP_EnsureGdipStarted();
            Gdiplus::Graphics gfx(hdc);
            gfx.SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);
            gfx.SetTextRenderingHint(Gdiplus::TextRenderingHintClearTypeGridFit);

            // Rounded border, sitting just inside the region edge.
            {
                using namespace Gdiplus;
                float r = (float)CORNER_R;
                float bw = (float)W - 1.0f;
                float bh = (float)H - 1.0f;
                GraphicsPath path;
                path.AddArc(0.0f,          0.0f,        r * 2, r * 2, 180.0f, 90.0f);
                path.AddArc(bw - r * 2,    0.0f,        r * 2, r * 2, 270.0f, 90.0f);
                path.AddArc(bw - r * 2,    bh - r * 2,  r * 2, r * 2,   0.0f, 90.0f);
                path.AddArc(0.0f,          bh - r * 2,  r * 2, r * 2,  90.0f, 90.0f);
                path.CloseFigure();
                Pen borderPen(AccentGdip(), 1.2f);
                gfx.DrawPath(&borderPen, &path);
            }

            // Header
            float hdrCy = (float)M + (float)HDR_H * 0.5f;

            // Shield badge on the left
            DrawShieldBadge(gfx, (float)M + HDR_SHIELD_W * 0.5f, hdrCy);

            // Bank name, left-aligned after the shield
            SetBkMode(hdc, TRANSPARENT);
            SetTextColor(hdc, g_statusMsg.empty() ? kTextBright : kAccentColor);
            HFONT oldFont = (HFONT)SelectObject(hdc, GetHeaderFont());
            RECT hdrRc;
            hdrRc.left   = HDR_TEXT_X;
            hdrRc.top    = M;
            hdrRc.right  = W - M - CLUSTER_W - 8;
            hdrRc.bottom = M + HDR_H;
            const wchar_t* title = !g_statusMsg.empty()  ? g_statusMsg.c_str()
                                   : g_bankName.empty() ? L"HOLY QUICK PANEL"
                                                        : g_bankName.c_str();
            // Uppercase the bank name for header consistency.
            wchar_t titleBuf[128];
            lstrcpynW(titleBuf, title, 128);
            CharUpperBuffW(titleBuf, (DWORD)lstrlenW(titleBuf));
            DrawTextW(hdc, titleBuf, -1, &hdrRc,
                      DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
            SelectObject(hdc, oldFont);

            // Right-side icon cluster — laid out right-to-left so it hugs
            // the right edge regardless of header width changes.
            ClusterRects cr = GetClusterRects();

            DrawControlsIndicator(gfx, (float)cr.ctrl.left, (float)cr.ctrl.top);
            DrawCheckboxDiamond(gfx, (float)cr.cbox.left, (float)cr.cbox.top, g_loadControlsOn);

            {
                HBRUSH dBr = CreateSolidBrush(kDividerGrey);
                FillRect(hdc, &cr.divider, dBr);
                DeleteObject(dBr);
            }

            DrawSnippetMgrIcon(gfx, (float)cr.mgr.left, (float)cr.mgr.top);

            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_LBUTTONDOWN: {
            POINT pt = { GET_X_LPARAM(lp), GET_Y_LPARAM(lp) };
            ClusterRects cr = GetClusterRects();

            // Shield badge → bank-switcher popup menu.
            {
                RECT shieldRect;
                shieldRect.left   = M;
                shieldRect.top    = M + (HDR_H - HDR_SHIELD_H) / 2;
                shieldRect.right  = M + HDR_SHIELD_W;
                shieldRect.bottom = M + (HDR_H + HDR_SHIELD_H) / 2;
                RECT shieldHit = InflateForHit(shieldRect, 4);
                if (PtInRect(&shieldHit, pt) && !g_allBanks.empty()) {
                    HMENU hMenu = CreatePopupMenu();
                    for (int i = 0; i < (int)g_allBanks.size(); i++) {
                        UINT flags = MF_STRING;
                        if (g_allBanks[i].id == g_activeBankId) flags |= MF_CHECKED;
                        AppendMenuW(hMenu, flags, (UINT)(2001 + i),
                                    g_allBanks[i].name.c_str());
                    }
                    POINT scPt;
                    GetCursorPos(&scPt);
                    int sel = (int)TrackPopupMenu(hMenu,
                        TPM_RETURNCMD | TPM_LEFTALIGN,
                        scPt.x, scPt.y, 0, hwnd, NULL);
                    DestroyMenu(hMenu);
                    if (sel >= 2001 && sel < 2001 + (int)g_allBanks.size()) {
                        int idx = sel - 2001;
                        g_activeBankId = g_allBanks[idx].id;
                        WriteActiveBankId(g_activeBankId);
                        LoadBanks();
                        RedrawWindow(hwnd, NULL, NULL,
                            RDW_INVALIDATE | RDW_ALLCHILDREN | RDW_UPDATENOW);
                    }
                    return 0;
                }
            }

            RECT cboxHit = InflateForHit(cr.cbox, 3);
            if (PtInRect(&cboxHit, pt)) {
                g_loadControlsOn = !g_loadControlsOn;
                InvalidateRect(hwnd, NULL, FALSE);
                // Persist state to quickpanel.json.
                json qp = ReadQuickPanelJson();
                qp["loadControlsOn"] = g_loadControlsOn;
                WriteQuickPanelJson(qp);
                OutputDebugStringW(g_loadControlsOn
                    ? L"[HolyQuickPanel] Load controls: ON\n"
                    : L"[HolyQuickPanel] Load controls: OFF\n");
                return 0;
            }

            RECT mgrHit = InflateForHit(cr.mgr, 3);
            if (PtInRect(&mgrHit, pt)) {
                // Write an openSnippetManager flag to quickpanel.json.
                // The main CEP panel polls for this and opens the manager.
                json qp = ReadQuickPanelJson();
                qp["openSnippetManager"] = true;
                WriteQuickPanelJson(qp);
                OutputDebugStringW(
                    L"[HolyQuickPanel] openSnippetManager flag written\n");
                DestroyWindow(hwnd);
                return 0;
            }
            break;
        }

        case WM_SETCURSOR: {
            // Show the hand cursor when hovering an interactive cluster icon.
            if (LOWORD(lp) == HTCLIENT) {
                POINT pt;
                GetCursorPos(&pt);
                ScreenToClient(hwnd, &pt);
                ClusterRects cr = GetClusterRects();
                RECT shieldRect;
                shieldRect.left   = M;
                shieldRect.top    = M + (HDR_H - HDR_SHIELD_H) / 2;
                shieldRect.right  = M + HDR_SHIELD_W;
                shieldRect.bottom = M + (HDR_H + HDR_SHIELD_H) / 2;
                RECT shieldHit = InflateForHit(shieldRect, 4);
                if (PtInRect(&cr.cbox, pt) || PtInRect(&cr.mgr, pt) ||
                    PtInRect(&shieldHit, pt)) {
                    SetCursor(LoadCursor(NULL, IDC_HAND));
                    return TRUE;
                }
            }
            break;
        }

        case WM_CTLCOLORBTN:
            return (LRESULT)GetStockObject(NULL_BRUSH);

        case WM_CLOSE:
            DestroyWindow(hwnd);
            return 0;

        case WM_DESTROY:
            KillTimer(hwnd, kStatusTimerId);
            if (g_mouseHook) {
                UnhookWindowsHookEx(g_mouseHook);
                g_mouseHook = NULL;
            }
            for (int i = 0; i < 3; i++) g_buttons[i] = NULL;
            if (g_popupHwnd == hwnd) g_popupHwnd = NULL;
            g_statusMsg.clear();
            return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}

static void HQP_EnsureClassRegistered()
{
    static bool registered = false;
    if (registered) return;

    WNDCLASSEXW wc = {};
    wc.cbSize        = sizeof(wc);
    wc.style         = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc   = HQP_WndProc;
    wc.hInstance     = g_hAexInstance ? g_hAexInstance : GetModuleHandleW(NULL);
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = NULL;
    wc.lpszClassName = kHQP_WndClass;
    RegisterClassExW(&wc);
    registered = true;
}

static void HQP_ShowPopupAtCursor()
{
    HQP_EnsureClassRegistered();

    if (g_popupHwnd && IsWindow(g_popupHwnd)) {
        DestroyWindow(g_popupHwnd);
        g_popupHwnd = NULL;
        return;
    }

    LoadBanks();  // populates g_bankName, g_snippets, g_allBanks (empty on failure)

    // Restore persisted checkbox state.
    {
        json qp = ReadQuickPanelJson();
        g_loadControlsOn = qp.value("loadControlsOn", false);
    }
    g_statusMsg.clear();

    POINT pt;
    GetCursorPos(&pt);
    int x = pt.x - W / 2;
    int y = pt.y - H / 2;

    HINSTANCE hInst = g_hAexInstance ? g_hAexInstance : GetModuleHandleW(NULL);

    g_popupHwnd = CreateWindowExW(
        WS_EX_TOOLWINDOW | WS_EX_TOPMOST,
        kHQP_WndClass,
        L"Holy Quick Panel",
        WS_POPUP | WS_VISIBLE,
        x, y, W, H,
        NULL, NULL,
        hInst,
        NULL);

    if (!g_popupHwnd) {
        DWORD err = GetLastError();
        wchar_t buf[128];
        wsprintfW(buf, L"CreateWindowExW failed. GetLastError=%lu", err);
        MessageBoxW(NULL, buf, L"HolyQuickPanel", MB_OK | MB_TOPMOST);
        return;
    }

    // Rounded-corner clip region. SetWindowRgn takes ownership of the HRGN.
    HRGN rgn = CreateRoundRectRgn(0, 0, W + 1, H + 1, CORNER_R * 2, CORNER_R * 2);
    SetWindowRgn(g_popupHwnd, rgn, TRUE);

    for (int i = 0; i < 3; i++) {
        int bx = M + i * BTN_W;  // edge-to-edge
        g_buttons[i] = CreateWindowExW(
            0, L"BUTTON", L"",
            WS_CHILD | WS_VISIBLE | BS_OWNERDRAW,
            bx, BTN_Y, BTN_W, BTN_H,
            g_popupHwnd,
            (HMENU)(INT_PTR)kBtnIds[i],
            hInst,
            NULL);
        if (g_buttons[i]) {
            SendMessageW(g_buttons[i], WM_SETFONT, (WPARAM)GetBodyFont(), TRUE);
        }
    }

    ShowWindow(g_popupHwnd, SW_SHOWNORMAL);
    UpdateWindow(g_popupHwnd);
    SetForegroundWindow(g_popupHwnd);
    SetFocus(g_popupHwnd);

    if (!g_mouseHook) {
        g_mouseHook = SetWindowsHookExW(
            WH_MOUSE_LL, HQP_MouseHook, hInst, 0);
    }
}

// ----------------------------------------------------------------------------
// AEGP plumbing
// ----------------------------------------------------------------------------

class HolyQuickPanel
{
public:
    SPBasicSuite*     i_pica_basicP;
    AEGP_PluginID     i_pluginID;
    AEGP_SuiteHandler i_sp;
    AEGP_Command      i_command;

    static SPAPI A_Err S_CommandHook(
        AEGP_GlobalRefcon   /*plugin_refconP*/,
        AEGP_CommandRefcon  refconP,
        AEGP_Command        command,
        AEGP_HookPriority   hook_priority,
        A_Boolean           already_handledB,
        A_Boolean*          handledPB)
    {
        PT_XTE_START {
            reinterpret_cast<HolyQuickPanel*>(refconP)->CommandHook(command, hook_priority, already_handledB, handledPB);
        } PT_XTE_CATCH_RETURN_ERR;
    }

    static A_Err S_UpdateMenuHook(
        AEGP_GlobalRefcon       plugin_refconP,
        AEGP_UpdateMenuRefcon   /*refconP*/,
        AEGP_WindowType         active_window)
    {
        PT_XTE_START {
            reinterpret_cast<HolyQuickPanel*>(plugin_refconP)->UpdateMenuHook(active_window);
        } PT_XTE_CATCH_RETURN_ERR;
    }

    HolyQuickPanel(SPBasicSuite* pica_basicP, AEGP_PluginID pluginID)
        : i_pica_basicP(pica_basicP)
        , i_pluginID(pluginID)
        , i_sp(pica_basicP)
    {
        g_instance = this;
        PT_ETX(i_sp.CommandSuite1()->AEGP_GetUniqueCommand(&i_command));
        PT_ETX(i_sp.CommandSuite1()->AEGP_InsertMenuCommand(
            i_command,
            STR(StrID_Name),
            AEGP_Menu_WINDOW,
            AEGP_MENU_INSERT_SORTED));

        PT_ETX(i_sp.RegisterSuite5()->AEGP_RegisterCommandHook(
            i_pluginID,
            AEGP_HP_BeforeAE,
            i_command,
            &HolyQuickPanel::S_CommandHook,
            (AEGP_CommandRefcon)(this)));

        PT_ETX(i_sp.RegisterSuite5()->AEGP_RegisterUpdateMenuHook(
            i_pluginID,
            &HolyQuickPanel::S_UpdateMenuHook,
            NULL));
    }

    void CommandHook(
        AEGP_Command       command,
        AEGP_HookPriority  /*hook_priority*/,
        A_Boolean          /*already_handledB*/,
        A_Boolean*         handledPB)
    {
        if (command == i_command) {
            HQP_ShowPopupAtCursor();
            if (handledPB) *handledPB = TRUE;
        }
    }

    void UpdateMenuHook(AEGP_WindowType /*active_window*/)
    {
        PT_ETX(i_sp.CommandSuite1()->AEGP_EnableCommand(i_command));
    }
};

static void HQP_ApplySnippetExpression(const std::wstring& expr,
                                       const std::wstring& snippetId)
{
    if (!g_instance) return;

    std::string escaped = EscapeJsString(expr);

    std::string script;
    script.reserve(escaped.size() + 1024);
    script +=
        "(function(){"
            "try{"
                "var __expr=\"";
    script += escaped;
    script +=
                "\";"
                "var comp=app.project?app.project.activeItem:null;"
                "if(!(comp instanceof CompItem))return;"
                "var layers=comp.selectedLayers;"
                "if(!layers||layers.length===0)return;"
                "app.beginUndoGroup(\"Holy Quick Panel: Apply Snippet\");"
                "try{"
                    "for(var i=0;i<layers.length;i++){"
                        "var sel=layers[i].selectedProperties||[];"
                        "for(var j=0;j<sel.length;j++){"
                            "var p=sel[j];"
                            "if(p&&p.canSetExpression){"
                                "try{p.expression=__expr;}catch(e){}"
                            "}"
                        "}"
                    "}"
                "}finally{app.endUndoGroup();}"
            "}catch(err){}"
        "})();";

    AEGP_MemHandle resultH = NULL;
    AEGP_MemHandle errorH  = NULL;
    try {
        g_instance->i_sp.UtilitySuite6()->AEGP_ExecuteScript(
            g_instance->i_pluginID,
            script.c_str(),
            FALSE,
            &resultH,
            &errorH);
    } catch (...) {}

    if (resultH) g_instance->i_sp.MemorySuite1()->AEGP_FreeMemHandle(resultH);
    if (errorH)  g_instance->i_sp.MemorySuite1()->AEGP_FreeMemHandle(errorH);

    // If load-controls is on and we have a snippet ID, apply the controls
    // payload. Reads banks.json directly so this works without the CEP panel
    // being open. Uses AE 2022+ built-in JSON.parse.
    if (!g_loadControlsOn || snippetId.empty()) return;

    std::string escapedId = EscapeJsString(snippetId);

    std::string ctrlScript;
    ctrlScript.reserve(2048);
    ctrlScript +=
        "(function(){"
          "try{"
            "var f=new File(Folder.userData.fullName+\"/HolyExpressor/banks.json\");"
            "if(!f.open(\"r\"))return;"
            "var data;try{data=JSON.parse(f.read());}catch(e){f.close();return;}"
            "f.close();"
            "var banks=data.banks||[];"
            "var snip=null;"
            "for(var bi=0;bi<banks.length;bi++){"
              "if(banks[bi].id==data.activeBankId){"
                "var snips=banks[bi].snippets||[];"
                "for(var si=0;si<snips.length;si++){"
                  "if(String(snips[si].id)===\"";
    ctrlScript += escapedId;
    ctrlScript +=
                  "\"){snip=snips[si];break;}"
                "}"
                "break;"
              "}"
            "}"
            "if(!snip||!snip.controls||!snip.controls.effects)return;"
            "var comp=app.project?app.project.activeItem:null;"
            "if(!(comp instanceof CompItem))return;"
            "var layers=comp.selectedLayers;"
            "if(!layers||layers.length===0)return;"
            "app.beginUndoGroup(\"Holy Quick Panel: Apply Controls\");"
            "try{"
              "for(var li=0;li<layers.length;li++){"
                "var layer=layers[li];"
                "var fxGroup=layer.property(\"ADBE Effect Parade\");"
                "var effects=snip.controls.effects||[];"
                "for(var ei=0;ei<effects.length;ei++){"
                  "var fxData=effects[ei];"
                  "try{"
                    "var fx=fxGroup.addProperty(fxData.matchName);"
                    "if(!fx)continue;"
                    "fx.name=fxData.name;"
                    "var props=fxData.properties||[];"
                    "for(var pi=0;pi<props.length;pi++){"
                      "try{"
                        "var propData=props[pi];"
                        "var prop=fx.property(propData.matchName);"
                        "if(!prop)continue;"
                        "prop.setValue(propData.value);"
                        "if(propData.expression){"
                          "prop.expression=propData.expression;"
                          "prop.expressionEnabled=true;"
                        "}"
                      "}catch(pe){}"
                    "}"
                  "}catch(ee){}"
                "}"
              "}"
            "}finally{app.endUndoGroup();}"
          "}catch(err){}"
        "})();";

    AEGP_MemHandle ctrlResultH = NULL;
    AEGP_MemHandle ctrlErrorH  = NULL;
    try {
        g_instance->i_sp.UtilitySuite6()->AEGP_ExecuteScript(
            g_instance->i_pluginID,
            ctrlScript.c_str(),
            FALSE,
            &ctrlResultH,
            &ctrlErrorH);
    } catch (...) {}

    if (ctrlResultH) g_instance->i_sp.MemorySuite1()->AEGP_FreeMemHandle(ctrlResultH);
    if (ctrlErrorH)  g_instance->i_sp.MemorySuite1()->AEGP_FreeMemHandle(ctrlErrorH);
}

A_Err EntryPointFunc(
    struct SPBasicSuite* pica_basicP,
    A_long               /*major_versionL*/,
    A_long               /*minor_versionL*/,
    AEGP_PluginID        aegp_plugin_id,
    AEGP_GlobalRefcon*   global_refconP)
{
    PT_XTE_START {
        *global_refconP = (AEGP_GlobalRefcon) new HolyQuickPanel(pica_basicP, aegp_plugin_id);
    } PT_XTE_CATCH_RETURN_ERR;
}
