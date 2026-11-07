using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

/// <summary>
/// V-ARCHIVE 클라이언트의 IE 문서를 모두 이어 붙여 stdout으로 보낸다.
/// 결과 배너(8B MX 99.76% (MaxCombo))와 로그 목록은 서로 다른 Internet Explorer_Server다.
/// 더 긴 로그만 고르면 맥스 콤보 문구가 빠진다.
/// </summary>
public class IeHtmlReader {
  delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  static extern bool EnumChildWindows(IntPtr hWnd, EnumProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  static extern uint RegisterWindowMessage(string lpString);

  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam,
    uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

  [DllImport("oleacc.dll")]
  static extern int ObjectFromLresult(
    IntPtr lResult, ref Guid riid, int wParam,
    [MarshalAs(UnmanagedType.IUnknown)] out object ppvObject);

  static readonly Guid IidHtmlDocument = new Guid("626FC520-A41E-11CF-A731-00A0C9082637");

  [STAThread]
  public static int Main() {
    Console.OutputEncoding = new UTF8Encoding(false);
    uint msg = RegisterWindowMessage("WM_HTML_GETOBJECT");
    var parts = new List<string>();

    EnumWindows((root, _) => {
      var title = new StringBuilder(512);
      GetWindowText(root, title, title.Capacity);
      if (title.ToString().IndexOf("V-ARCHIVE", StringComparison.OrdinalIgnoreCase) < 0)
        return true;

      EnumChildWindows(root, (child, __) => {
        var cls = new StringBuilder(256);
        GetClassName(child, cls, cls.Capacity);
        if (cls.ToString() != "Internet Explorer_Server") return true;
        string html = ReadOuterHtml(child, msg);
        if (!string.IsNullOrEmpty(html)) parts.Add(html);
        return true;
      }, IntPtr.Zero);
      return true;
    }, IntPtr.Zero);

    if (parts.Count == 0) {
      Console.Error.WriteLine("V-ARCHIVE 클라이언트 로그를 읽지 못함");
      return 1;
    }

    Console.Write(string.Join("\n", parts.ToArray()));
    return 0;
  }

  static string ReadOuterHtml(IntPtr hwnd, uint msg) {
    IntPtr lResult;
    SendMessageTimeout(hwnd, msg, IntPtr.Zero, IntPtr.Zero, 2, 1000, out lResult);
    if (lResult == IntPtr.Zero) return "";
    object docObj;
    var iid = IidHtmlDocument;
    if (ObjectFromLresult(lResult, ref iid, 0, out docObj) != 0 || docObj == null)
      return "";
    try {
      dynamic doc = docObj;
      return (string)doc.documentElement.outerHTML ?? "";
    } catch {
      return "";
    }
  }
}
