import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  creationCount: number;
  createdAt: Date;
}

interface UserManagerProps {
  users: User[];
}

export function UserManager({ users }: UserManagerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Creations</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No users yet
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.creationCount}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {user.isAdmin && (
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  )}
                  {user.isSuspended && (
                    <Badge variant="destructive" className="text-xs">Suspended</Badge>
                  )}
                  {!user.isAdmin && !user.isSuspended && (
                    <span className="text-xs text-muted-foreground">User</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/users`}
                  className="text-sm text-primary hover:underline"
                >
                  Manage
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
