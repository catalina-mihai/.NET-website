using RegTech.Web.OtcLookup.Services;

namespace RegTech.Web.OtcLookup.Interfaces
{
    public interface ILogoutService
    {
        Task DoLogoutAsync(string username);
    }
}
