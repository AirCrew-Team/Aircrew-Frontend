import UsersHeader from "@/modules/users/components/UsersHeader"
import UsersStats from "@/modules/users/components/UsersStats"
import UsersTable from "@/modules/users/components/UsersTable"
import UsersToolbar from "@/modules/users/components/UsersToolbar"


const UsuariosPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1 y 2. Encabezado e indicadores. Apilados hasta pantallas grandes (xl), donde
          caben en una fila sin apretar el título. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <UsersHeader />
        <UsersStats />
      </div>

      {/* 3. Buscador, filtros por rol y alta de usuario. (?page=, ?q=, ?role=)*/}
      <UsersToolbar />

      {/* 4. Tabla de usuarios con su paginación. */}
      <UsersTable />
    </div>
  )
}

export default UsuariosPage
