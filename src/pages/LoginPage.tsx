import DevRoleSwitcher from "@/components/custom/DevRoleSwitcher"

const LoginPage = () => {
  return (
    <>
      <title>Iniciar sesión | AirCrew</title>
      <div>LoginPage</div>
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </>
  )
}

export default LoginPage
