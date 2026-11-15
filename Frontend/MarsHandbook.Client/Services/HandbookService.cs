using System.Text.Json;
using Microsoft.JSInterop;
namespace MarsHandbook.Client.Services;

public sealed record Cat(string Slug, string Name, string Desc, int Count, string? Image, string? Credit);
public sealed record Mod(string Slug, string Name, string Desc, int Count, List<Cat> Cats);
public sealed record Art(string Module, string Slug, string Title, string Summary, string Cat, string Date);
public sealed record Bm(string M, string S, string T);

/// <summary>Reads the five handbook modules, their topics and articles from the team backend; keeps bookmarks in the browser.</summary>
public sealed class HandbookService
{
    public static readonly (string Slug, string Label)[] Order =
    {
        ("discover-mars", "Discover Mars"),
        ("survival-knowledge", "Survival Knowledge"),
        ("living-on-mars", "Living on Mars"),
        ("science-technology", "Science & Technology"),
        ("human-survival", "Human Survival"),
    };

    // The backend seeds some names in Vietnamese even for language=en; show English on the English site.
    static readonly Dictionary<string, string> CatEn = new()
    {
        ["exploration-history"] = "History of Mars exploration", ["structure-and-terrain"] = "Structure and terrain",
        ["atmosphere-temperature-gravity"] = "Atmosphere, temperature, gravity", ["water-and-life"] = "Water and signs of life",
        ["missions-and-rovers"] = "NASA missions and rovers",
        ["oxygen-and-low-pressure"] = "Oxygen and low pressure", ["extreme-temperatures"] = "Extreme temperatures",
        ["space-radiation"] = "Space radiation", ["dust-storms"] = "Dust storms", ["partial-gravity"] = "Partial gravity",
        ["housing"] = "Habitats and housing", ["water-and-oxygen"] = "Water and oxygen", ["food"] = "Food production",
        ["energy"] = "Energy", ["sanitation-and-waste"] = "Sanitation and waste", ["community"] = "Community life",
        ["physical-health"] = "Physical health", ["mental-health"] = "Mental health", ["nutrition"] = "Nutrition",
        ["medical-care"] = "Medical care", ["teamwork"] = "Teamwork", ["adapting-to-isolation"] = "Adapting to isolation",
    };
    static readonly Dictionary<string, string> ModEn = new()
    {
        ["discover-mars"] = "Explore Mars through verified NASA science: history, terrain, atmosphere, water and missions.",
        ["survival-knowledge"] = "The hazards a human body faces on Mars: thin air, cold, radiation, dust and low gravity.",
        ["living-on-mars"] = "How a crew could live on Mars: habitats, water and oxygen, food, energy, waste and community.",
        ["science-technology"] = "The technologies that make survival possible, from ISRU to water recycling and radiation shielding.",
        ["human-survival"] = "Body, mind and teamwork far from Earth: health, nutrition, medical care and isolation.",
    };
    static bool IsVi(string? s) => !string.IsNullOrEmpty(s) && System.Text.RegularExpressions.Regex.IsMatch(s, "[ăâđêôơưĂÂĐÊÔƠƯạ-ỹẠ-Ỹ]");
    static string Humanize(string slug) => slug.Length == 0 ? slug : char.ToUpperInvariant(slug[0]) + slug[1..].Replace('-', ' ');
    static string CatName(string slug, string name) => !IsVi(name) && name.Length > 0 ? name : CatEn.TryGetValue(slug, out var en) ? en : Humanize(slug);
    static string ModDesc(string slug, string desc) => !IsVi(desc) && desc.Length > 0 ? desc : ModEn.TryGetValue(slug, out var en) ? en : "";

    readonly MarsApi _api; readonly IJSRuntime _js;
    List<Mod>? _mods; List<Art>? _arts;
    public HandbookService(MarsApi api, IJSRuntime js) { _api = api; _js = js; }

    public static string Label(string slug) => Order.FirstOrDefault(o => o.Slug == slug).Label ?? slug;
    public static bool Known(string slug) => Order.Any(o => o.Slug == slug);

    public async Task<List<Mod>> ModulesAsync()
    {
        if (_mods is not null) return _mods;
        var res = await Task.WhenAll(Order.Select(o => _api.GetJsonAsync($"api/{o.Slug}?language=en")));
        var list = new List<Mod>();
        for (var i = 0; i < Order.Length; i++)
        {
            var j = res[i];
            var cats = j.A("categories").Select(c => new Cat(
                c.S("slug") ?? "", CatName(c.S("slug") ?? "", c.S("name") ?? ""), IsVi(c.S("description")) ? "" : c.S("description") ?? "",
                c.I("publishedArticleCount"), c.S("imageUrl"), c.S("imageCredit"))).ToList();
            list.Add(new Mod(Order[i].Slug, IsVi(j.S("name")) ? Order[i].Label : j.S("name") ?? Order[i].Label, ModDesc(Order[i].Slug, j.S("description") ?? ""), j.I("publishedArticleCount"), cats));
        }
        return _mods = list;
    }

    public async Task<List<Art>> ArticlesAsync(string module)
    {
        if (!Known(module)) return new List<Art>();
        var path = module == "science-technology"
            ? "api/science-technology/technologies?language=en"
            : $"api/{module}/articles?language=en";
        var j = await _api.GetJsonAsync(path);
        var items = j.ValueKind == JsonValueKind.Array ? j.EnumerateArray().ToList() : j.A("items");
        return items.Select(e => new Art(module, e.S("slug") ?? "", e.S("title") ?? "Untitled", e.S("summary") ?? "",
            e.S("categorySlug") ?? "", (e.S("reviewedAt") ?? e.S("publishedAt") ?? "").Split('T')[0])).ToList();
    }

    public async Task<List<Art>> AllArticlesAsync()
    {
        if (_arts is not null) return _arts;
        var res = await Task.WhenAll(Order.Select(o => ArticlesAsync(o.Slug)));
        return _arts = res.SelectMany(x => x).ToList();
    }

    public Task<JsonElement> DetailAsync(string module, string slug)
    {
        if (!Known(module)) throw new InvalidOperationException("Unknown module.");
        var s = Uri.EscapeDataString(slug);
        return _api.GetJsonAsync(module == "science-technology"
            ? $"api/science-technology/technologies/{s}?language=en"
            : $"api/{module}/articles/{s}?language=en");
    }

    public string Abs(string path) => new Uri(_api.BaseUri, path).ToString();

    // ---- bookmarks (browser localStorage, tab-separated lines) ----
    public async Task<List<Bm>> BookmarksAsync()
    {
        try
        {
            var s = await _js.InvokeAsync<string>("mhui.bmGet");
            return (s ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(l => l.Split('\t'))
                .Where(p => p.Length == 3).Select(p => new Bm(p[0], p[1], p[2])).ToList();
        }
        catch { return new List<Bm>(); }
    }

    public async Task<bool> ToggleAsync(string m, string s, string t)
    {
        var l = await BookmarksAsync();
        var ex = l.FirstOrDefault(x => x.M == m && x.S == s);
        bool on;
        if (ex is not null) { l.Remove(ex); on = false; }
        else { l.Add(new Bm(m, s, t.Replace('\t', ' ').Replace('\n', ' '))); on = true; }
        try { await _js.InvokeVoidAsync("mhui.bmSet", string.Join('\n', l.Select(x => $"{x.M}\t{x.S}\t{x.T}"))); } catch { }
        return on;
    }
}
