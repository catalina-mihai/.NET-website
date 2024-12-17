using Microsoft.AspNetCore.Authentication.Cookies;
using RegTech.Web.OtcLookup.Interfaces;
using RegTech.Web.OtcLookup.Options;
using RegTech.Web.OtcLookup.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllersWithViews();
builder.Services.Configure<ExternalApiOptions>(builder.Configuration.GetSection("ExternalApi"));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ILogoutService, LogoutService>();

// Register IHttpClientFactory
builder.Services.AddHttpClient();

// Add session services
builder.Services.AddDistributedMemoryCache(); // For in-memory cache
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(60); // Set session timeout
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true; // Mark the session cookie as essential
});

// Add Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Login"; // Redirect to login page if not authenticated
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());
});

builder.Services.AddControllersWithViews();


var app = builder.Build();

app.UseExceptionHandler("/Home/Error");
app.UseHsts();

// Redirect HTTP to HTTPS
app.UseHttpsRedirection();

// Use static files (for CSS, JS, Images)
app.UseStaticFiles();

app.UseRouting();
app.UseSession();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Login}/{id?}");

app.Run();
