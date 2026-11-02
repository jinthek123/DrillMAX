using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class IeHtmlReader
{
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern bool EnumChildWindows(IntPtr hWnd, EnumProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        IntPtr wParam,
        IntPtr lParam,
        uint fuFlags,
        uint uTimeout,
        out IntPtr lpdwResult);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern uint RegisterWindowMessage(string lpString);

    [DllImport("oleacc.dll", PreserveSig = false)]
    static extern void ObjectFromLresult(
        IntPtr lResult,
        ref Guid riid,
        IntPtr wParam,
        [MarshalAs(UnmanagedType.Interface)] out object ppvObject);

    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public struct RECT
    {
        public int Left, Top, Right, Bottom;
    }

    public static IntPtr FindVArchiveWindow()
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) =>
        {
            var t = new StringBuilder(512);
            GetWindowText(h, t, 512);
            var title = t.ToString();
            if (title.IndexOf("V-ARCHIVE", StringComparison.OrdinalIgnoreCase) >= 0
                && title.IndexOf("클라이언트", StringComparison.Ordinal) >= 0)
            {
                found = h;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public static List<IntPtr> FindIeServers(IntPtr parent)
    {
        var list = new List<IntPtr>();
        EnumChildWindows(parent, (h, l) =>
        {
            var sb = new StringBuilder(256);
            GetClassName(h, sb, 256);
            if (sb.ToString() == "Internet Explorer_Server")
                list.Add(h);
            return true;
        }, IntPtr.Zero);
        return list;
    }

    public static string GetHtml(IntPtr ieHwnd)
    {
        uint msg = RegisterWindowMessage("WM_HTML_GETOBJECT");
        IntPtr result;
        SendMessageTimeout(ieHwnd, msg, IntPtr.Zero, IntPtr.Zero, 2, 2000, out result);
        if (result == IntPtr.Zero) return null;

        // IHTMLDocument
        Guid iid = new Guid("626FC520-A41E-11CF-A731-00A0C9082637");
        object docObj;
        ObjectFromLresult(result, ref iid, IntPtr.Zero, out docObj);
        dynamic doc = docObj;
        try
        {
            return (string)doc.documentElement.outerHTML;
        }
        catch
        {
            try { return (string)doc.body.innerText; }
            catch { return null; }
        }
    }

    public static string ReadBestHtml()
    {
        var win = FindVArchiveWindow();
        if (win == IntPtr.Zero) return null;
        string best = null;
        int bestLen = 0;
        foreach (var ie in FindIeServers(win))
        {
            var html = GetHtml(ie);
            if (html != null && html.Length > bestLen)
            {
                best = html;
                bestLen = html.Length;
            }
        }
        return best;
    }

    public static int Main(string[] args)
    {
        var html = ReadBestHtml();
        if (string.IsNullOrEmpty(html))
        {
            Console.Error.WriteLine("NO_HTML");
            return 1;
        }
        Console.OutputEncoding = Encoding.UTF8;
        Console.Write(html);
        return 0;
    }
}
